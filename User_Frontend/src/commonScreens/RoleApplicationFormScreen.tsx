import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Modal,
  PermissionsAndroid,
  NativeModules,
} from 'react-native';
import COLORS from '../customerModule/constants/colors';
import ScreenContainer from '../customerModule/components/ScreenContainer';

import ArrowBackwardIcon from '../customerModule/assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { useLanguage } from '../i18n';
import { customerApi, filesApi, getSession, roleApplicationsApi } from '../utils/api';
import { confirmOtpPhoneOnly, verifyPhoneNumber } from '../utils/firebase';
import { preloadDocumentOcr, scanDocumentNumber } from '../utils/documentOcr';
import {
  DOCUMENT_OPTIONS,
  getRoleApplicationConfig,
} from './roleApplicationConfig';

type Props = {
  onNavigate?: (screen: string, params?: any) => void;
  onSwitchRole?: (role: string) => void;
  routeParams?: any;
};

interface UploadedDocument {
  type: string;
  name: string;
  downloadUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploading?: boolean;
}

const RoleApplicationFormScreen = ({ onNavigate, onSwitchRole, routeParams }: Props) => {
  const { t } = useLanguage();
  const roleId = routeParams?.role || 'pilot';
  // Never render the pilot form for customer/unknown roles (customer needs no
  // form — see AccountsScreen confirmation flow). Navigate back instead.
  const config: any = getRoleApplicationConfig(roleId);
  useEffect(() => {
    if (!getRoleApplicationConfig(routeParams?.role)) {
      onNavigate?.('Back');
    }
  }, [roleId]);

  // Guest mode: pick up the invite code stashed from the deep link (in addition
  // to an explicit route param) so the user never types it.
  useEffect(() => {
    if (!isGuest || inviteCode) return;
    (async () => {
      try {
        const { Storage } = await import('../utils/storage');
        const { extractReferralCode } = await import('../utils/referral');
        const pending = await Storage.getItem('@pending_referral_code').catch(() => null);
        const found = extractReferralCode(pending);
        if (found) setInviteCode(found);
      } catch {
        // no stashed code — submit will explain
      }
    })();
  }, [isGuest, inviteCode]);
  if (!config) {
    return null;
  }

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [customOtherName, setCustomOtherName] = useState('');
  const [uploadedDocsMap, setUploadedDocsMap] = useState<Record<string, UploadedDocument>>({});
  const [docNumbersMap, setDocNumbersMap] = useState<Record<string, string>>({});
  // On-device auto-read state per doc: 'scanning' | 'auto' | 'unreadable'.
  // Numbers are ALWAYS auto-read on-device (zero backend/AWS load) and stored
  // in `docNumbersMap` — there is no manual entry field.
  const [docScanMap, setDocScanMap] = useState<Record<string, string>>({});
  const [docNumberSourceMap, setDocNumberSourceMap] = useState<Record<string, 'auto'>>({});
  // Image popup preview for uploaded documents.
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  // Original picked file per doc (web Blob / native uri) so "Retry scan" can
  // re-run OCR without forcing a re-upload.
  const lastFileRef = useRef<Record<string, any>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Pilot-only: resume upload (image / pdf / docx)
  const [resumeFile, setResumeFile] = useState<UploadedDocument | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);

  // ── Guest mode (no-login Refer & Earn flow: invite link → this form) ──
  const isGuest = !!(routeParams as any)?.guest;
  const [inviteCode, setInviteCode] = useState<string | null>(
    typeof (routeParams as any)?.referralCode === 'string'
      ? (routeParams as any).referralCode.toUpperCase().trim() || null
      : null,
  );
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOtp, setGuestOtp] = useState('');
  const [guestOtpContext, setGuestOtpContext] = useState<any>(null);
  const [guestOtpSent, setGuestOtpSent] = useState(false);
  const [guestSendingOtp, setGuestSendingOtp] = useState(false);
  const [guestVerifying, setGuestVerifying] = useState(false);
  const [guestVerifiedPhone, setGuestVerifiedPhone] = useState<string | null>(null);
  const [guestIdToken, setGuestIdToken] = useState<string | null>(null);

  const normalizeGuestPhone = (raw: string): string | null => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
    return null;
  };

  const sendGuestOtp = async () => {
    const full = normalizeGuestPhone(guestPhone);
    if (!full) {
      Alert.alert(t('Invalid Number'), t('Enter a valid 10-digit mobile number.'));
      return;
    }
    setGuestSendingOtp(true);
    try {
      const ctx = await verifyPhoneNumber(full);
      setGuestOtpContext(ctx);
      setGuestOtpSent(true);
      Alert.alert(t('OTP Sent'), t('Enter the OTP sent to {{phone}}.', { phone: full }));
    } catch (error: any) {
      Alert.alert(t('OTP Failed'), error?.message || t('Could not send OTP. Try again.'));
    } finally {
      setGuestSendingOtp(false);
    }
  };

  const verifyGuestOtp = async () => {
    if (!guestOtpContext || guestOtp.trim().length < 4) {
      Alert.alert(t('Invalid OTP'), t('Enter the OTP you received.'));
      return;
    }
    setGuestVerifying(true);
    try {
      const result = await confirmOtpPhoneOnly(guestOtpContext, guestOtp.trim());
      if (result.authed) {
        // Development test number — a backend session now exists; the rest of
        // the flow continues authenticated (uploads + submit use the session).
        Alert.alert(t('Verified'), t('Phone verified. Continue with your application.'));
        setGuestVerifiedPhone(result.phoneNumber);
        return;
      }
      setGuestVerifiedPhone(result.phoneNumber);
      setGuestIdToken(result.firebaseIdToken);
      setFormData((prev) => ({ ...prev, phone: result.phoneNumber }));
      Alert.alert(t('Verified'), t('Phone verified. Continue with your application.'));
    } catch (error: any) {
      Alert.alert(t('Verification Failed'), error?.message || t('Incorrect or expired OTP.'));
    } finally {
      setGuestVerifying(false);
    }
  };

  /** Upload routing: guests (post-OTP) use the public endpoint with their Firebase token. */
  const uploadFileForSession = async (form: FormData) => {
    if (isGuest && !guestVerifiedPhone) {
      throw new Error(t('Verify your phone number (OTP) before uploading documents.'));
    }
    if (isGuest && guestIdToken) {
      form.append('firebaseIdToken', guestIdToken);
      return filesApi.uploadGuest(form);
    }
    return filesApi.upload(form);
  };

  const fileInputRef = useRef<any>(null);
  const resumeInputRef = useRef<any>(null);

  // Warm the on-device OCR worker during idle — first scan feels instant.
  // Zero backend / AWS involvement; worker loads lazily from the app bundle.
  useEffect(() => {
    preloadDocumentOcr();
  }, []);

  /**
   * Fire-and-forget on-device scan. Runs IN PARALLEL with the Firebase upload
   * so it never slows submission. The number is ALWAYS machine-read (multi-
   * pass OCR) — never typed — so what lands in the DB is the auto-read value.
   */
  const autoScanDocument = (docId: string, fileOrUri: any) => {
    if (docId === 'others' || !fileOrUri) return;
    lastFileRef.current[docId] = fileOrUri;
    setDocScanMap((prev) => ({ ...prev, [docId]: 'scanning' }));
    scanDocumentNumber(fileOrUri, docId)
      .then((res: any) => {
        if (res?.number) {
          setDocNumbersMap((prev) => ({ ...prev, [docId]: res.number }));
          setDocNumberSourceMap((prev) => ({ ...prev, [docId]: 'auto' as const }));
          setDocScanMap((prev) => ({ ...prev, [docId]: 'auto' }));
        } else {
          setDocScanMap((prev) => ({ ...prev, [docId]: 'unreadable' }));
        }
      })
      .catch(() => {
        setDocScanMap((prev) => ({ ...prev, [docId]: 'unreadable' }));
      });
  };

  /** Re-run the on-device scan using the originally picked file (no re-upload). */
  const retryScanDocument = (docId: string) => {
    const fileOrUri = lastFileRef.current[docId];
    if (!fileOrUri) {
      Alert.alert(t('Re-upload Needed'), t('Please upload the document again to retry auto-read.'));
      return;
    }
    autoScanDocument(docId, fileOrUri);
  };

  const isDocImage = (uploaded: UploadedDocument | undefined) => {
    const url = String(uploaded?.downloadUrl || '');
    const name = String(uploaded?.fileName || '');
    const mime = String(uploaded?.mimeType || '');
    if (mime.startsWith('image/')) return true;
    if (/\.pdf($|\?)/i.test(url) || /\.pdf($|\?)/i.test(name)) return false;
    return true;
  };

  const isPilotRole = roleId === 'pilot' || config.backendRole === 'pilot';

  useEffect(() => {
    if (isGuest) return; // guests have no session — they verify OTP in-form
    Promise.all([customerApi.getCurrentUser().catch(() => null), getSession()])
      .then(([currentUser, session]) => {
        const u: any = currentUser || session?.user || null;
        const profile = u?.profileData || {};
        setFormData({
          name: u?.name || profile?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
          address: profile?.address || profile?.region || '',
        });
      })
      .catch((error) => console.error('Failed to load user profile', error));
  }, []);

  const updateField = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const requiredFields = useMemo(() => config.fields.filter((f: any) => f.required), [config]);

  // Toggle document in dropdown
  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Resolve display name for a doc type
  const getDocDisplayName = (id: string) => {
    if (id === 'others') {
      return customOtherName.trim() ? customOtherName.trim() : t('Other Document');
    }
    const found = DOCUMENT_OPTIONS.find((opt) => opt.id === id);
    return found ? t(found.label) : id;
  };

  // Upload handler for Web files
  const handleWebFileSelected = async (event: any) => {
    const file = event?.target?.files?.[0];
    const docId = activeUploadDocId;
    if (!file || !docId) return;

    const docName = getDocDisplayName(docId);
    // On-device auto-read starts instantly, in parallel with the upload.
    autoScanDocument(docId, file);
    setUploadedDocsMap((prev) => ({
      ...prev,
      [docId]: {
        type: docId,
        name: docName,
        uploading: true,
      },
    }));

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'kyc');
      form.append('documentType', docId);

      const res = await uploadFileForSession(form);
      const downloadUrl = res?.downloadUrl || res?.cdnUrl || '';
      const storagePath = res?.storagePath || res?.fileId || '';

      // Firebase-only: reject local /files/ URLs from old backends.
      if (!downloadUrl || downloadUrl.startsWith('/files/')) {
        throw new Error(
          res?.downloadUrl?.startsWith?.('/files/')
            ? 'File was stored locally instead of Firebase Storage. Fix the Storage bucket, then retry.'
            : 'Upload did not return a Firebase Storage URL. Please retry.',
        );
      }

      setUploadedDocsMap((prev) => ({
        ...prev,
        [docId]: {
          type: docId,
          name: docName,
          downloadUrl,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploading: false,
        },
      }));
    } catch (error: any) {
      console.error('File upload failed', error);
      Alert.alert(t('Upload Failed'), error?.message || t('Could not upload the file to cloud storage.'));
      setUploadedDocsMap((prev) => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
    } finally {
      setActiveUploadDocId(null);
      if (event?.target) event.target.value = '';
    }
  };

  // Upload handler for Native camera/gallery/files
  const handleNativeUpload = async (docId: string, source: 'camera' | 'gallery' | 'file') => {
    const docName = getDocDisplayName(docId);
    try {
      let fileUri = '';
      let fileName = '';
      let fileType = '';
      let fileSize: number | undefined = undefined;

      if (source === 'file') {
        const picker = NativeModules.NativeFilePicker;
        if (picker?.pickDocument) {
          const picked = await picker.pickDocument();
          if (!picked?.uri) return;
          fileUri = picked.uri;
          fileName = picked.name || `${docId}_${Date.now()}.pdf`;
          fileType = picked.type || 'application/pdf';
          fileSize = picked.size;
        } else {
          // Fallback to gallery
          const { launchImageLibrary } = require('react-native-image-picker');
          const result = await launchImageLibrary({
            mediaType: 'mixed',
            quality: 0.8,
            selectionLimit: 1,
          });
          const asset = result?.assets?.[0];
          if (!asset?.uri) return;
          fileUri = asset.uri;
          fileName = asset.fileName || `${docId}_${Date.now()}.jpg`;
          fileType = asset.type || 'image/jpeg';
          fileSize = asset.fileSize;
        }
      } else if (source === 'camera') {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(t('Permission Denied'), t('Camera permission is required to capture documents.'));
            return;
          }
        }
        const { launchCamera } = require('react-native-image-picker');
        const result = await launchCamera({
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1600,
          maxHeight: 1600,
        });
        const asset = result?.assets?.[0];
        if (!asset?.uri) return;
        fileUri = asset.uri;
        fileName = asset.fileName || `${docId}_${Date.now()}.jpg`;
        fileType = asset.type || 'image/jpeg';
        fileSize = asset.fileSize;
      } else {
        const { launchImageLibrary } = require('react-native-image-picker');
        const result = await launchImageLibrary({
          mediaType: 'mixed',
          quality: 0.8,
          maxWidth: 1600,
          maxHeight: 1600,
          selectionLimit: 1,
        });
        const asset = result?.assets?.[0];
        if (!asset?.uri) return;
        fileUri = asset.uri;
        fileName = asset.fileName || `${docId}_${Date.now()}.${asset.type === 'application/pdf' ? 'pdf' : 'jpg'}`;
        fileType = asset.type || 'image/jpeg';
        fileSize = asset.fileSize;
      }

      if (!fileUri) return;

      // On-device auto-read (ML Kit if installed, else instant manual fallback).
      autoScanDocument(docId, fileUri);

      setUploadedDocsMap((prev) => ({
        ...prev,
        [docId]: {
          type: docId,
          name: docName,
          uploading: true,
        },
      }));

      const form = new FormData();
      form.append('file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      } as any);
      form.append('category', 'kyc');
      form.append('documentType', docId);

      const res = await uploadFileForSession(form);
      const downloadUrl = res?.downloadUrl || res?.cdnUrl || '';
      const storagePath = res?.storagePath || res?.fileId || '';

      // Firebase-only: never fall back to the local file:// uri.
      if (!downloadUrl || downloadUrl.startsWith('/files/')) {
        throw new Error(
          'File was not stored in Firebase Storage. Fix the Storage bucket, then retry.',
        );
      }

      setUploadedDocsMap((prev) => ({
        ...prev,
        [docId]: {
          type: docId,
          name: docName,
          downloadUrl,
          storagePath,
          fileName: fileName,
          fileSize: fileSize,
          mimeType: fileType,
          uploading: false,
        },
      }));
    } catch (error: any) {
      console.error('Native upload failed', error);
      Alert.alert(t('Upload Failed'), error?.message || t('Could not upload the selected file.'));
      setUploadedDocsMap((prev) => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
    }
  };

  const triggerUploadForDoc = (docId: string) => {
    setActiveUploadDocId(docId);
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      Alert.alert(
        t('Upload Document'),
        t('Choose how you want to upload {{doc}}', { doc: getDocDisplayName(docId) }),
        [
          { text: t('Choose PDF / Document'), onPress: () => handleNativeUpload(docId, 'file') },
          { text: t('Choose from Gallery / Photos'), onPress: () => handleNativeUpload(docId, 'gallery') },
          { text: t('Take Picture (Camera)'), onPress: () => handleNativeUpload(docId, 'camera') },
          { text: t('Cancel'), style: 'cancel' },
        ],
      );
    }
  };

  const removeUploadedDoc = (docId: string) => {
    setUploadedDocsMap((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    setDocNumbersMap((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    setDocScanMap((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    setDocNumberSourceMap((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    delete lastFileRef.current[docId];
  };

  const RESUME_ACCEPT = 'image/jpeg,image/png,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const handleResumeWebSelected = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    setResumeFile({ type: 'resume', name: file.name || 'resume', uploading: true });
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'kyc');
      form.append('documentType', 'resume');
      const res = await uploadFileForSession(form);
      const downloadUrl = res?.downloadUrl || res?.cdnUrl || '';
      const storagePath = res?.storagePath || res?.fileId || '';
      if (!downloadUrl || downloadUrl.startsWith('/files/')) {
        throw new Error('Upload did not return a Firebase Storage URL. Please retry.');
      }
      setResumeFile({
        type: 'resume',
        name: file.name || 'resume',
        downloadUrl,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploading: false,
      });
    } catch (error: any) {
      console.error('Resume upload failed', error);
      Alert.alert(t('Upload Failed'), error?.message || t('Could not upload the resume.'));
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
      if (event?.target) event.target.value = '';
    }
  };

  const handleResumeNativeUpload = async (source: 'camera' | 'gallery' | 'file') => {
    try {
      let fileUri = '';
      let fileName = '';
      let fileType = '';
      let fileSize: number | undefined = undefined;
      if (source === 'file') {
        const picker = NativeModules.NativeFilePicker;
        if (picker?.pickDocument) {
          const picked = await picker.pickDocument();
          if (!picked?.uri) return;
          fileUri = picked.uri;
          fileName = picked.name || `resume_${Date.now()}.pdf`;
          fileType = picked.type || 'application/pdf';
          fileSize = picked.size;
        } else {
          const { launchImageLibrary } = require('react-native-image-picker');
          const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8, selectionLimit: 1 });
          const asset = result?.assets?.[0];
          if (!asset?.uri) return;
          fileUri = asset.uri;
          fileName = asset.fileName || `resume_${Date.now()}.jpg`;
          fileType = asset.type || 'image/jpeg';
          fileSize = asset.fileSize;
        }
      } else if (source === 'camera') {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(t('Permission Denied'), t('Camera permission is required to capture documents.'));
            return;
          }
        }
        const { launchCamera } = require('react-native-image-picker');
        const result = await launchCamera({ mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 });
        const asset = result?.assets?.[0];
        if (!asset?.uri) return;
        fileUri = asset.uri;
        fileName = asset.fileName || `resume_${Date.now()}.jpg`;
        fileType = asset.type || 'image/jpeg';
        fileSize = asset.fileSize;
      } else {
        const { launchImageLibrary } = require('react-native-image-picker');
        const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8, maxWidth: 1600, maxHeight: 1600, selectionLimit: 1 });
        const asset = result?.assets?.[0];
        if (!asset?.uri) return;
        fileUri = asset.uri;
        fileName = asset.fileName || `resume_${Date.now()}.jpg`;
        fileType = asset.type || 'image/jpeg';
        fileSize = asset.fileSize;
      }
      if (!fileUri) return;
      setResumeUploading(true);
      setResumeFile({ type: 'resume', name: fileName, uploading: true });
      const form = new FormData();
      form.append('file', { uri: fileUri, name: fileName, type: fileType } as any);
      form.append('category', 'kyc');
      form.append('documentType', 'resume');
      const res = await uploadFileForSession(form);
      const downloadUrl = res?.downloadUrl || res?.cdnUrl || '';
      const storagePath = res?.storagePath || res?.fileId || '';
      if (!downloadUrl || downloadUrl.startsWith('/files/')) {
        throw new Error('File was not stored in Firebase Storage. Fix the Storage bucket, then retry.');
      }
      setResumeFile({ type: 'resume', name: fileName, downloadUrl, storagePath, fileName, fileSize, mimeType: fileType, uploading: false });
    } catch (error: any) {
      console.error('Resume upload failed', error);
      Alert.alert(t('Upload Failed'), error?.message || t('Could not upload the resume.'));
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
    }
  };

  const triggerResumeUpload = () => {
    if (Platform.OS === 'web') {
      resumeInputRef.current?.click();
    } else {
      Alert.alert(t('Upload Resume'), t('Choose how you want to upload your resume (image, PDF or DOCX)'), [
        { text: t('Choose PDF / DOCX'), onPress: () => handleResumeNativeUpload('file') },
        { text: t('Choose from Gallery / Photos'), onPress: () => handleResumeNativeUpload('gallery') },
        { text: t('Take Picture (Camera)'), onPress: () => handleResumeNativeUpload('camera') },
        { text: t('Cancel'), style: 'cancel' },
      ]);
    }
  };



  // Validation
  const hasAtLeastTwoSelected = selectedDocIds.length >= 2;
  const allSelectedUploaded =
    hasAtLeastTwoSelected &&
    selectedDocIds.every((id) => {
      const doc = uploadedDocsMap[id];
      return doc && doc.downloadUrl && !doc.uploading;
    });

  const isFieldEmpty = (f: any) => {
    const v = formData[f.key];
    if (f.type === 'multiselect') {
      return !Array.isArray(v) || v.length === 0;
    }
    if (f.type === 'number') {
      // Allow 0 as a valid value; only empty/NaN is missing.
      if (v === 0 || v === '0') return false;
      return v === undefined || v === null || String(v ?? '').trim() === '' || isNaN(Number(v));
    }
    return !String(v ?? '').trim();
  };
  const missingRequiredFields = requiredFields.filter(isFieldEmpty);

  // Pilot-only: experience range checks + resume required
  const experienceYearsNum = Number(formData.experienceYears);
  const experienceMonthsNum = Number(formData.experienceMonths);
  const experienceInvalid = isPilotRole && (
    isNaN(experienceYearsNum) || experienceYearsNum < 0 || experienceYearsNum > 60 ||
    isNaN(experienceMonthsNum) || experienceMonthsNum < 0 || experienceMonthsNum > 11
  );
  const resumeMissing = isPilotRole && (!resumeFile?.downloadUrl || resumeUploading);

  const missingDocNumbers = selectedDocIds.filter(
    (id) => id !== 'others' && !String(docNumbersMap[id] || '').trim(),
  );
  const allDocNumbersProvided = missingDocNumbers.length === 0;

  const isFormValid =
    missingRequiredFields.length === 0 && allSelectedUploaded && allDocNumbersProvided && !submitting &&
    (!isPilotRole || (!experienceInvalid && !resumeMissing)) &&
    (!isGuest || (!!guestVerifiedPhone && (!!guestIdToken || !!inviteCode)));

  const handleSubmit = async () => {
    if (missingRequiredFields.length > 0) {
      Alert.alert(
        t('Missing Fields'),
        t('Please fill in {{count}} required field(s): {{fields}}', {
          count: missingRequiredFields.length,
          fields: missingRequiredFields.map((f: any) => t(f.label)).join(', '),
        }),
      );
      return;
    }

    if (!hasAtLeastTwoSelected) {
      Alert.alert(t('Select Documents'), t('Please select at least 2 documents from the dropdown.'));
      return;
    }

    if (!allSelectedUploaded) {
      Alert.alert(
        t('Upload Remaining Documents'),
        t('Please upload all selected documents before submitting your application.'),
      );
      return;
    }

    if (!allDocNumbersProvided) {
      Alert.alert(
        t('Document Number Auto-Read Pending'),
        t('We could not auto-read the number from: {{docs}}. Tap Retry scan or re-upload a clearer photo of the document.', {
          docs: missingDocNumbers.map(getDocDisplayName).join(', '),
        }),
      );
      return;
    }

    if (isPilotRole) {
      if (experienceInvalid) {
        Alert.alert(
          t('Invalid Experience'),
          t('Enter valid experience: years 0-60 and months 0-11.'),
        );
        return;
      }
      if (!resumeFile?.downloadUrl || resumeUploading) {
        Alert.alert(t('Resume Required'), t('Please upload your resume (image, PDF or DOCX).'));
        return;
      }
      if (String(resumeFile.downloadUrl).startsWith('/files/')) {
        Alert.alert(
          t('Upload Not in Cloud'),
          t('Resume was stored locally instead of Firebase Storage. Please re-upload.'),
        );
        return;
      }
    }

    // Firebase-only: never submit local /files/ URLs. Force re-upload.
    const localDocs = selectedDocIds.filter((id) =>
      String(uploadedDocsMap[id]?.downloadUrl || '').startsWith('/files/'),
    );
    if (localDocs.length > 0) {
      Alert.alert(
        t('Upload Not in Cloud'),
        t('Some documents were stored locally instead of Firebase Storage. Please re-upload them after the Storage bucket is fixed.'),
      );
      return;
    }

    // Send ONLY the 5 fields every backend version accepts
    // (type, name, number, storagePath, downloadUrl).
    // fileName/mimeType/fileSize are already stored in the file_metadata
    // collection at upload time — including them here breaks OLD production
    // backends running with whitelist+forbidNonWhitelisted ("property
    // fileName should not exist"). Never add extra keys here.
    const finalDocuments = selectedDocIds.map((id) => {
      const u = uploadedDocsMap[id];
      return {
        type: id,
        name: getDocDisplayName(id),
        number: String(docNumbersMap[id] || '').trim(),
        downloadUrl: u?.downloadUrl || '',
        storagePath: u?.storagePath || '',
      };
    });

    // Guest (no-login) path: phone must be OTP-verified in-form and the invite
    // code travels automatically — never typed by the applicant.
    if (isGuest) {
      if (!guestVerifiedPhone) {
        Alert.alert(t('Verify Phone'), t('Verify your mobile number with OTP first.'));
        return;
      }
      const guestCode =
        inviteCode ||
        (await (async () => {
          try {
            const { Storage } = await import('../utils/storage');
            const { extractReferralCode } = await import('../utils/referral');
            return extractReferralCode(
              await Storage.getItem('@pending_referral_code').catch(() => null),
            );
          } catch {
            return null;
          }
        })());
      if (!guestCode) {
        Alert.alert(
          t('Invite Expired'),
          t('We could not find your invite code. Ask your inviter for a fresh referral link.'),
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const submitFormData: Record<string, any> = {
        ...formData,
        // Provenance of each doc number (auto = on-device OCR, manual = typed).
        // Stored inside free-form formData so no backend DTO / AWS change needed.
        _docNumberSource: { ...docNumberSourceMap },
      };
      if (isPilotRole) {
        submitFormData.experienceYears = Number(formData.experienceYears ?? 0);
        submitFormData.experienceMonths = Number(formData.experienceMonths ?? 0);
        submitFormData.resumeUrl = resumeFile?.downloadUrl || '';
        submitFormData.resumeName = resumeFile?.fileName || 'resume';
        submitFormData.resumeStoragePath = resumeFile?.storagePath || '';
      }
      // Refer & Earn: attach a deep-link code (from invite link or manual entry).
      let referralCode: string | undefined;
      try {
        const { Storage } = await import('../utils/storage');
        const { extractReferralCode } = await import('../utils/referral');
        const pending = await Storage.getItem('@pending_referral_code').catch(() => null);
        const fromParams = (routeParams as any)?.referralCode;
        referralCode = extractReferralCode(fromParams || pending) ?? undefined;
        if (referralCode) {
          await Storage.removeItem('@pending_referral_code').catch(() => {});
        }
      } catch {
        // storage unavailable — submit without a code
      }
      if (isGuest && guestIdToken && guestVerifiedPhone) {
        // True guest path (real Firebase number): no backend session.
        const guestCode = inviteCode;
        if (!guestCode) {
          throw new Error(
            t('We could not find your invite code. Ask your inviter for a fresh referral link.'),
          );
        }
        await roleApplicationsApi.submitGuest({
          role: config.backendRole,
          roleLabel: config.title,
          formData: submitFormData,
          documents: finalDocuments,
          referralCode: guestCode,
          firebaseIdToken: guestIdToken,
          phone: guestVerifiedPhone,
        });
        try {
          const { Storage } = await import('../utils/storage');
          await Storage.removeItem('@pending_referral_code').catch(() => {});
        } catch {
          // best-effort cleanup
        }
        onNavigate?.('ApplicationSuccessScreen', { role: roleId, guest: true });
        return;
      }
      await roleApplicationsApi.submit({
        role: config.backendRole,
        roleLabel: config.title,
        formData: submitFormData,
        documents: finalDocuments,
        ...(referralCode ? { referralCode } : {}),
      });
      onNavigate?.('ApplicationSuccessScreen', { role: roleId });
    } catch (error: any) {
      console.error('Failed to submit application', error);
      Alert.alert(
        t('Submission Failed'),
        error?.message || t('We could not submit your application. Please try again later.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMultiSelect = (key: string, option: string) =>
    setFormData((prev) => {
      const cur = Array.isArray(prev[key]) ? [...prev[key]] : [];
      return { ...prev, [key]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option] };
    });

  const renderInput = (field: any) => {
    const { key, label, type } = field;
    if (type === 'multiselect') {
      const selected: string[] = Array.isArray(formData[key]) ? formData[key] : [];
      return (
        <View key={key} style={styles.inputWrapper}>
          <Text style={styles.label}>
            {t(label)}{' '}
            {field.required && <Text style={styles.asterisk}>*</Text>}
          </Text>
          <View style={styles.chipRow}>
            {(field.options || []).map((opt: string) => {
              const active = selected.includes(opt);
              return (
                <Pressable
                  key={opt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => !submitting && toggleMultiSelect(key, opt)}
                  disabled={submitting}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(opt)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }
    const multiline = type === 'textarea';
    const isNumber = type === 'number';
    return (
      <View key={key} style={styles.inputWrapper}>
        <Text style={styles.label}>
          {t(label)}{' '}
          {field.required && <Text style={styles.asterisk}>*</Text>}
        </Text>
        <TextInput
          value={String(formData[key] ?? '')}
          onChangeText={(value) => updateField(key, isNumber ? value.replace(/[^0-9]/g, '') : value)}
          style={[styles.input, multiline && styles.inputMultiline]}
          multiline={multiline}
          placeholder={field.placeholder ? t(field.placeholder) : t(`Enter ${label.toLowerCase()}`)}
          placeholderTextColor="#9CA3AF"
          keyboardType={type === 'email' ? 'email-address' : type === 'phone' || isNumber ? (Platform.OS === 'web' ? 'numeric' : 'number-pad') : 'default'}
          editable={!submitting}
        />
      </View>
    );
  };

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate?.('Back')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Application for {{role}}', { role: t(config.title) })}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.infoText}>{t(config.description)}</Text>

        {isGuest && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerTitle}>
              {t('You were invited as {{role}}', { role: t(config.title) })}
            </Text>
            <Text style={styles.guestBannerText}>
              {inviteCode
                ? t('Invite code {{code}} attached automatically — no login needed. Just verify your number and fill the form.', { code: inviteCode })
                : t('No login needed. Just verify your number and fill the form.')}
            </Text>
          </View>
        )}

        {isGuest && !guestVerifiedPhone && (
          <View style={styles.guestOtpCard}>
            <Text style={styles.sectionTitle}>{t('1. Verify your mobile number')}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>
                {t('Mobile Number')} <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={guestPhone}
                onChangeText={setGuestPhone}
                placeholder={t('10-digit mobile number')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!guestOtpSent}
              />
            </View>
            {!guestOtpSent ? (
              <Pressable
                style={[styles.submitBtn, guestSendingOtp && styles.submitBtnDisabled]}
                onPress={sendGuestOtp}
                disabled={guestSendingOtp}
              >
                <Text style={styles.submitBtnText}>
                  {guestSendingOtp ? t('Sending OTP...') : t('Send OTP')}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>
                  {t('OTP')} <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={guestOtp}
                  onChangeText={setGuestOtp}
                  placeholder={t('Enter OTP')}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
                <Pressable
                  style={[styles.submitBtn, guestVerifying && styles.submitBtnDisabled, { marginTop: 12 }]}
                  onPress={verifyGuestOtp}
                  disabled={guestVerifying}
                >
                  <Text style={styles.submitBtnText}>
                    {guestVerifying ? t('Verifying...') : t('Verify OTP')}
                  </Text>
                </Pressable>
                <Pressable onPress={sendGuestOtp} disabled={guestSendingOtp} style={{ marginTop: 8 }}>
                  <Text style={styles.resendText}>
                    {guestSendingOtp ? t('Resending...') : t('Resend OTP')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {isGuest && guestVerifiedPhone && (
          <View style={styles.guestVerifiedRow}>
            <Text style={styles.guestVerifiedText}>
              {t('✓ {{phone}} verified — fill the form below', { phone: guestVerifiedPhone })}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('Personal & Role Details')}</Text>
        {config.fields.map(renderInput)}

        {isPilotRole && (
          <View style={styles.uploadRowCard}>
            <View style={styles.uploadRowLeft}>
              <View style={[styles.docIconBox, resumeFile?.downloadUrl ? styles.docIconBoxDone : styles.docIconBoxPending]}>
                <Text style={styles.docIconText}>{resumeFile?.downloadUrl ? '📄' : '📎'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docCardTitle}>{t('Upload Resume')} <Text style={styles.asterisk}>*</Text></Text>
                {resumeUploading ? (
                  <Text style={styles.docUploadingText}>{t('Uploading to cloud storage...')}</Text>
                ) : resumeFile?.downloadUrl ? (
                  <View style={styles.doneStatusRow}>
                    <Text style={styles.docDoneBadge}>{t('✓ Uploaded')}</Text>
                    {resumeFile.fileName ? (
                      <Text style={styles.docFileName} numberOfLines={1}> {resumeFile.fileName}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.docPendingText}>{t('Image, PDF or DOCX')}</Text>
                )}
              </View>
            </View>
            <View style={styles.uploadRowActions}>
              {resumeUploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : resumeFile?.downloadUrl ? (
                <View style={styles.actionButtonGroup}>
                  <Pressable style={styles.changeBtn} onPress={triggerResumeUpload} disabled={submitting}>
                    <Text style={styles.changeBtnText}>{t('Change')}</Text>
                  </Pressable>
                  <Pressable style={styles.removeBtn} onPress={() => setResumeFile(null)} disabled={submitting}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.uploadBtn} onPress={triggerResumeUpload} disabled={submitting}>
                  <Text style={styles.uploadBtnText}>{t('Upload')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* --- Upload Documents Section --- */}
        <View style={styles.docSectionHeaderRow}>
          <Text style={styles.sectionTitleBlack}>{t('Upload Documents')}</Text>
          <View style={[styles.badge, hasAtLeastTwoSelected ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={[styles.badgeText, hasAtLeastTwoSelected ? styles.badgeSuccessText : styles.badgeWarningText]}>
              {t('{{count}} Selected (Min 2)', { count: selectedDocIds.length })}
            </Text>
          </View>
        </View>

        {/*<Text style={styles.subText}>
          {t('Select at least 2 documents from the dropdown list and upload clear photos or files for verification.')}
        </Text>*/}

        {/* Multi-select Dropdown Trigger */}
        <Pressable
          style={styles.dropdownTrigger}
          onPress={() => setIsDropdownOpen((prev) => !prev)}
        >
          <View style={{ flex: 1 }}>
            {/*<Text style={styles.dropdownTriggerLabel}>{t('Choose Documents to Upload *')}</Text>*/}
            <Text style={styles.dropdownTriggerValue} numberOfLines={1}>
              {selectedDocIds.length === 0
                ? t('Tap to select documents (Select at least 2)')
                : selectedDocIds.map(getDocDisplayName).join(', ')}
            </Text>
          </View>
          <Text style={styles.dropdownArrow}>{isDropdownOpen ? '▲' : '▼'}</Text>
        </Pressable>

        {/* Dropdown Options List */}
        {isDropdownOpen && (
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownHeaderHint}>
              {t('Select at least 2 documents you will provide:')}
            </Text>
            {DOCUMENT_OPTIONS.map((opt) => {
              const isSelected = selectedDocIds.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowSelected]}
                  onPress={() => toggleDocSelection(opt.id)}
                >
                  <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
                    {isSelected && <Text style={styles.checkboxCheckmark}>✓</Text>}
                  </View>
                  <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                    {t(opt.label)}
                  </Text>
                </Pressable>
              );
            })}

            {selectedDocIds.includes('others') && (
              <View style={styles.otherInputBox}>
                <Text style={styles.otherInputLabel}>{t('Specify Other Document Name:')}</Text>
                <TextInput
                  value={customOtherName}
                  onChangeText={setCustomOtherName}
                  style={styles.otherInput}
                  placeholder={t('e.g. Electricity Bill / Land Deed')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            <Pressable
              style={styles.dropdownDoneBtn}
              onPress={() => setIsDropdownOpen(false)}
            >
              <Text style={styles.dropdownDoneBtnText}>{t('Done')}</Text>
            </Pressable>
          </View>
        )}

        {/* Document Upload Fields for Selected Documents */}
        <Text style={[styles.sectionTitleBlack, { marginTop: 24, marginBottom: 10 }]}>
          {t('Selected Documents Checklist')}
        </Text>

        {selectedDocIds.length === 0 ? (
          <View style={styles.emptyDocNotice}>
            <Text style={styles.emptyDocNoticeText}>
              {t('Please select at least 2 documents from the dropdown above to proceed with uploading.')}
            </Text>
          </View>
        ) : (
          selectedDocIds.map((docId) => {
            const docName = getDocDisplayName(docId);
            const uploaded = uploadedDocsMap[docId];
            const isUploading = uploaded?.uploading;
            const isDone = !!uploaded?.downloadUrl && !isUploading;

            const docIsImage = isDone && isDocImage(uploaded);
            return (
              <View key={docId} style={styles.uploadRowCard}>
                <View style={styles.uploadRowLeft}>
                  {docIsImage && uploaded?.downloadUrl ? (
                    <Pressable
                      onPress={() =>
                        setPreviewDoc({
                          url: String(uploaded.downloadUrl),
                          title: docName,
                        })
                      }
                    >
                      <Image source={{ uri: String(uploaded.downloadUrl) }} style={styles.docThumbnail} />
                    </Pressable>
                  ) : (
                    <View style={[styles.docIconBox, isDone ? styles.docIconBoxDone : styles.docIconBoxPending]}>
                      <Text style={styles.docIconText}>{isDone ? '📄' : '📎'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.docCardTitle}>{docName}</Text>
                    {isUploading ? (
                      <Text style={styles.docUploadingText}>{t('Uploading to cloud storage...')}</Text>
                    ) : isDone ? (
                      <View style={styles.doneStatusRow}>
                        <Text style={styles.docDoneBadge}>{t('✓ Uploaded')}</Text>
                        {uploaded.fileName ? (
                          <Text style={styles.docFileName} numberOfLines={1}>
                            {' '}{uploaded.fileName}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.docPendingText}>{t('Not uploaded yet')}</Text>
                    )}
                    {docIsImage && uploaded?.downloadUrl ? (
                      <Pressable
                        onPress={() =>
                          setPreviewDoc({
                            url: String(uploaded.downloadUrl),
                            title: docName,
                          })
                        }
                      >
                        <Text style={styles.docViewHint}>{t('Tap image to view')}</Text>
                      </Pressable>
                    ) : null}

                    {docId !== 'others' && (
                      <View style={styles.docAutoBox}>
                        {docScanMap[docId] === 'scanning' ? (
                          <View style={styles.docAutoRow}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={[styles.docScanHint, { marginLeft: 8 }]}>
                              {t('Reading document number…')}
                            </Text>
                          </View>
                        ) : String(docNumbersMap[docId] || '').trim() ? (
                          <>
                            <Text style={styles.docAutoLabel}>
                              {t('{{doc}} Number (auto-read)', { doc: docName })}
                            </Text>
                            <Text style={styles.docAutoNumber} selectable>
                              {String(docNumbersMap[docId])}
                            </Text>
                            <Text style={styles.docScanAuto}>{t('✓ Auto-read from document')}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.docScanError}>
                              {t("Couldn't auto-read the number yet.")}
                            </Text>
                            <View style={styles.docAutoRow}>
                              <Pressable
                                style={styles.retryBtn}
                                onPress={() => retryScanDocument(docId)}
                                disabled={submitting || docScanMap[docId] === 'scanning'}
                              >
                                <Text style={styles.retryBtnText}>{t('Retry scan')}</Text>
                              </Pressable>
                              <Text style={[styles.docScanHint, { flex: 1, marginLeft: 8 }]}>
                                {t('Or re-upload a clearer, well-lit photo.')}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.uploadRowActions}>
                  {isUploading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : isDone ? (
                    <View style={styles.actionButtonGroup}>
                      <Pressable
                        style={styles.changeBtn}
                        onPress={() => triggerUploadForDoc(docId)}
                        disabled={submitting}
                      >
                        <Text style={styles.changeBtnText}>{t('Change')}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => removeUploadedDoc(docId)}
                        disabled={submitting}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.uploadBtn}
                      onPress={() => triggerUploadForDoc(docId)}
                      disabled={submitting}
                    >
                      <Text style={styles.uploadBtnText}>{t('Upload')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Assistant status message */}
        <View style={styles.submissionStatusBox}>
          {!hasAtLeastTwoSelected ? (
            <Text style={styles.statusHelperWarn}>
              {t('⚠️ Select at least 2 documents from the dropdown to continue.')}
            </Text>
          ) : !allSelectedUploaded ? (
            <Text style={styles.statusHelperWarn}>
              {t('⚠️ Please upload all {{count}} selected document(s) above.', {
                count: selectedDocIds.length,
              })}
            </Text>
          ) : !allDocNumbersProvided ? (
            <Text style={styles.statusHelperWarn}>
              {t('⚠️ Auto-reading document number(s) for: {{docs}}. Tap Retry scan or re-upload a clearer photo.', {
                docs: missingDocNumbers.map(getDocDisplayName).join(', '),
              })}
            </Text>
          ) : isPilotRole && experienceInvalid ? (
            <Text style={styles.statusHelperWarn}>
              {t('⚠️ Enter valid experience: years 0-60 and months 0-11.')}
            </Text>
          ) : isPilotRole && resumeMissing ? (
            <Text style={styles.statusHelperWarn}>
              {t('⚠️ Please upload your resume (image, PDF or DOCX).')}
            </Text>
          ) : (
            <Text style={styles.statusHelperSuccess}>
              {t('✓ All {{count}} selected documents have been uploaded successfully.', {
                count: selectedDocIds.length,
              })}
            </Text>
          )}
        </View>

        {/* Submit Application Button */}
        <Pressable
          style={[styles.submitBtn, !isFormValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isFormValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{t('Submit Application')}</Text>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          {t(
            'Your application will be sent to our admin for approval. You will be notified once it is approved or rejected.',
          )}
        </Text>
      </ScrollView>

      {/* Hidden Web file inputs */}
      {Platform.OS === 'web' &&
        React.createElement('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/jpeg,image/png,image/jpg,application/pdf',
          style: { display: 'none' },
          onChange: handleWebFileSelected,
        })}
      {Platform.OS === 'web' &&
        React.createElement('input', {
          ref: resumeInputRef,
          type: 'file',
          accept: RESUME_ACCEPT,
          style: { display: 'none' },
          onChange: handleResumeWebSelected,
        })}

      {/* Uploaded image popup preview (tap any document image to enlarge) */}
      <Modal
        transparent
        visible={!!previewDoc}
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewDoc?.title || t('Document')}
              </Text>
              <Pressable style={styles.previewCloseBtn} onPress={() => setPreviewDoc(null)}>
                <Text style={styles.previewCloseText}>✕</Text>
              </Pressable>
            </View>
            {previewDoc?.url ? (
              <Image
                source={{ uri: previewDoc.url }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  heading: {
    marginLeft: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  infoText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },
  docSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitleBlack: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeWarningText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeSuccessText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },
  subText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  asterisk: {
    color: '#EF4444',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  inputMultiline: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  dropdownTriggerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dropdownTriggerValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  dropdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownHeaderHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownOptionRowSelected: {
    backgroundColor: '#EEF2FF',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  dropdownOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  otherInputBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  otherInputLabel: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
    fontWeight: '500',
  },
  otherInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  dropdownDoneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  dropdownDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDocNotice: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyDocNoticeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  uploadRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  uploadRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  docThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconBoxPending: {
    backgroundColor: '#F1F5F9',
  },
  docIconBoxDone: {
    backgroundColor: '#DCFCE7',
  },
  docIconText: {
    fontSize: 20,
  },
  docCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  docUploadingText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  doneStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docDoneBadge: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  docFileName: {
    fontSize: 11,
    color: '#64748B',
    maxWidth: 120,
  },
  docPendingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  docAutoBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  docAutoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docAutoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  docAutoNumber: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  docViewHint: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  docScanError: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 6,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '90%',
    maxWidth: 640,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  previewTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  previewCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 480,
    backgroundColor: '#0F172A',
  },
  docScanHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  docScanAuto: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
  },
  uploadRowActions: {
    alignItems: 'flex-end',
  },
  uploadBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  changeBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  submissionStatusBox: {
    marginTop: 12,
    marginBottom: 8,
  },
  statusHelperWarn: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
    textAlign: 'center',
  },
  statusHelperSuccess: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  guestBanner: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  guestBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 4,
  },
  guestBannerText: {
    fontSize: 13,
    color: '#4C1D95',
    lineHeight: 19,
  },
  guestOtpCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  guestVerifiedRow: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  guestVerifiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
});

export default RoleApplicationFormScreen;