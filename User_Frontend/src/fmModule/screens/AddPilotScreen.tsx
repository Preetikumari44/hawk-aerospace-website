import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, BackHandler, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const DOCUMENTS = [
    'Aadhar Card Front Side',
    'Aadhar Card Back Side',
    'Pilot License',
    'GST Registration Document',
    'Pilot Training Certifications',
];

const CERTIFICATION_OPTIONS = [
    'Chemical Handling', 'Advanced Flight Operations', 'Night Operations',
    'Emergency Procedures', 'GPS Navigation', 'Precision Farming',
];

const SERVICE_TYPE_OPTIONS = [
    'monitoring', 'videography', 'seeding', 'surveillance', 'mapping', 'spraying',
];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

const COUNTRY_CODES = [
    { code: '+91', label: 'IN +91' },
    { code: '+1', label: 'US +1' },
    { code: '+44', label: 'UK +44' },
    { code: '+61', label: 'AU +61' },
    { code: '+1', label: 'CA +1' },
    { code: '+65', label: 'SG +65' },
    { code: '+971', label: 'AE +971' },
    { code: '+966', label: 'SA +966' },
    { code: '+974', label: 'QA +974' },
    { code: '+968', label: 'OM +968' },
    { code: '+973', label: 'BH +973' },
    { code: '+965', label: 'KW +965' },
    { code: '+20', label: 'EG +20' },
    { code: '+27', label: 'ZA +27' },
    { code: '+234', label: 'NG +234' },
    { code: '+254', label: 'KE +254' },
    { code: '+233', label: 'GH +233' },
    { code: '+255', label: 'TZ +255' },
    { code: '+256', label: 'UG +256' },
    { code: '+260', label: 'ZM +260' },
    { code: '+263', label: 'ZW +263' },
    { code: '+91', label: 'NP +977' },
    { code: '+880', label: 'BD +880' },
    { code: '+94', label: 'LK +94' },
    { code: '+92', label: 'PK +92' },
    { code: '+93', label: 'AF +93' },
    { code: '+95', label: 'MM +95' },
    { code: '+66', label: 'TH +66' },
    { code: '+63', label: 'PH +63' },
    { code: '+62', label: 'ID +62' },
    { code: '+60', label: 'MY +60' },
    { code: '+84', label: 'VN +84' },
    { code: '+86', label: 'CN +86' },
    { code: '+81', label: 'JP +81' },
    { code: '+82', label: 'KR +82' },
    { code: '+7', label: 'RU +7' },
    { code: '+49', label: 'DE +49' },
    { code: '+33', label: 'FR +33' },
    { code: '+39', label: 'IT +39' },
    { code: '+34', label: 'ES +34' },
    { code: '+351', label: 'PT +351' },
    { code: '+31', label: 'NL +31' },
    { code: '+32', label: 'BE +32' },
    { code: '+41', label: 'CH +41' },
    { code: '+43', label: 'AT +43' },
    { code: '+46', label: 'SE +46' },
    { code: '+47', label: 'NO +47' },
    { code: '+45', label: 'DK +45' },
    { code: '+358', label: 'FI +358' },
    { code: '+30', label: 'GR +30' },
    { code: '+48', label: 'PL +48' },
    { code: '+420', label: 'CZ +420' },
    { code: '+36', label: 'HU +36' },
    { code: '+40', label: 'RO +40' },
    { code: '+359', label: 'BG +359' },
    { code: '+7', label: 'KZ +7' },
    { code: '+54', label: 'AR +54' },
    { code: '+55', label: 'BR +55' },
    { code: '+56', label: 'CL +56' },
    { code: '+57', label: 'CO +57' },
    { code: '+51', label: 'PE +51' },
    { code: '+52', label: 'MX +52' },
];

const AddPilotScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const [inviteCode, setInviteCode] = useState('');
    const [pilotName, setPilotName] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [aadhar, setAadhar] = useState('');
    const [license, setLicense] = useState('');
    const [panCard, setPanCard] = useState('');
    const [age, setAge] = useState('');
    const [startTime, setStartTime] = useState('06:00');
    const [endTime, setEndTime] = useState('18:00');
    const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>(
        { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true }
    );
    const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
    const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
    const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
    const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('AddResource'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    const allChecked = DOCUMENTS.every(d => checkedDocs[d]);

    const toggleDoc = (doc: string) => {
        const newChecked = { ...checkedDocs, [doc]: !checkedDocs[doc] };
        setCheckedDocs(newChecked);
        if (newChecked[doc]) {
            setUploadedDocs(prev => prev.includes(doc) ? prev : [...prev, doc]);
        } else {
            setUploadedDocs(prev => prev.filter(d => d !== doc));
        }
    };

    const toggleChip = (item: string, selected: string[], setSelected: (v: string[]) => void) => {
        setSelected(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev => ({ ...prev, [day]: !prev[day] }));
    };

    const fullPhone = () => {
        const digits = mobile.trim().replace(/\D/g, '');
        return `${countryCode}${digits}`;
    };

    const handleAddPilot = async () => {
        if (!pilotName.trim() || !mobile.trim() || !license.trim()) return;
        setSubmitting(true);
        try {
            const phoneWithCode = fullPhone();
            const result = await fleetApi.initiatePilotCreation({
                fullName: pilotName.trim(),
                mobile: phoneWithCode,
                address: address.trim(),
                email: email.trim() || undefined,
                age: parseInt(age, 10) || undefined,
                aadhaarNumber: aadhar.trim() || undefined,
                panNumber: panCard.trim() || undefined,
                license: {
                    licenseNumber: license.trim(),
                    licenseType: 'DGCA',
                    issueDate: new Date().toISOString().split('T')[0],
                    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
                },
                experience: {
                    totalFlightHours: 0,
                    totalMissions: 0,
                },
                certifications: selectedCertifications,
                serviceTypes: selectedServiceTypes,
                availability: {
                    startTime,
                    endTime,
                    ...selectedDays,
                },
                documents: uploadedDocs.map((doc) => ({ type: doc, url: '' })),
            });
            onNavigate && onNavigate('OTPVerification', { phone: phoneWithCode });
        } catch (err: any) {
            Alert.alert(t('Error'), err?.message || t('Failed to send OTP. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    const INVITE_CHARS = inviteCode.split('').slice(0, 6);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => onNavigate && onNavigate('AddResource')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Onboard New Pilot')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                {/* INVITE CODE SECTION */}
                <Text style={styles.sectionTitle}>{t('Add Pilot Using Invite Code')}</Text>
                <Text style={styles.sectionSub}>{t('Ask the Pilot to share their invite-code. Copy and Paste that Code here to add the Pilot')}</Text>

                <View style={styles.inviteRow}>
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <View key={idx} style={styles.inviteSlot}>
                            <Text style={styles.inviteChar}>{INVITE_CHARS[idx] || ''}</Text>
                            <View style={styles.inviteUnderline} />
                        </View>
                    ))}
                </View>

                {/* Hidden input capturing the invite code */}
                <TextInput
                    style={styles.hiddenInput}
                    value={inviteCode}
                    onChangeText={text => setInviteCode(text.slice(0, 6).toUpperCase())}
                    maxLength={6}
                    autoCapitalize="characters"
                />

                <View style={styles.orRow}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>{t('OR')}</Text>
                    <View style={styles.orLine} />
                </View>

                {/* REGISTER NEW PILOT */}
                <Text style={styles.sectionTitle}>{t('Register New Pilot')}</Text>
                <Text style={styles.sectionSub}>{t('Fill the form and upload the documents to add the Pilot to your Fleet')}</Text>

                <Text style={styles.fieldLabel}>{t('Enter Pilot Name')} <Text style={styles.red}>*</Text></Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot Name')} placeholderTextColor="#94A3B8" value={pilotName} onChangeText={setPilotName} />

                <Text style={styles.fieldLabel}>{t('Enter Pilot Mobile Number')} <Text style={styles.red}>*</Text></Text>
                <View style={styles.mobileRow}>
                    <TouchableOpacity style={styles.countryCodeBox} activeOpacity={0.8} onPress={() => setShowCountryPicker(!showCountryPicker)}>
                        <Text style={styles.countryCode}>{countryCode} {showCountryPicker ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    <TextInput style={[styles.input, styles.mobileInput]} placeholder={t('Enter Pilot Mobile Number')} placeholderTextColor="#94A3B8" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
                </View>
                {showCountryPicker && (
                    <View style={styles.countryPickerDropdown}>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {COUNTRY_CODES.map((cc) => (
                                <TouchableOpacity key={`${cc.code}-${cc.label}`} style={[styles.countryPickerOption, countryCode === cc.code && styles.countryPickerOptionActive]} onPress={() => { setCountryCode(cc.code); setShowCountryPicker(false); }}>
                                    <Text style={[styles.countryPickerOptionText, countryCode === cc.code && styles.countryPickerOptionTextActive]}>{cc.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <Text style={styles.fieldLabel}>{t('Enter Pilot Address')} <Text style={styles.red}>*</Text></Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot Address')} placeholderTextColor="#94A3B8" value={address} onChangeText={setAddress} />

                <Text style={styles.fieldLabel}>{t('Enter Pilot Email ID')}</Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot Email ID')} placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} keyboardType="email-address" />

                <Text style={styles.fieldLabel}>{t('Enter Pilot Aadhar Card Number')} <Text style={styles.red}>*</Text></Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot Aadhar Card Number')} placeholderTextColor="#94A3B8" value={aadhar} onChangeText={setAadhar} keyboardType="numeric" />

                <Text style={styles.fieldLabel}>{t('Enter Pilot License Number')} <Text style={styles.red}>*</Text></Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot License Number')} placeholderTextColor="#94A3B8" value={license} onChangeText={setLicense} />

                <Text style={styles.fieldLabel}>{t('Enter Pilot Pan Card Number')}</Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot Pan Card Number')} placeholderTextColor="#94A3B8" value={panCard} onChangeText={setPanCard} />

                <Text style={styles.fieldLabel}>{t('Enter Pilot Age')} <Text style={styles.red}>*</Text></Text>
                <TextInput style={styles.input} placeholder={t('Enter Pilot Age')} placeholderTextColor="#94A3B8" value={age} onChangeText={setAge} keyboardType="numeric" />

                <Text style={styles.fieldLabel}>{t('Availability Hours')}</Text>
                <View style={styles.timeRow}>
                    <View style={styles.timeInputWrapper}>
                        <Text style={styles.timeLabel}>{t('Start Time')}</Text>
                        <TextInput style={styles.input} placeholder="06:00" placeholderTextColor="#94A3B8" value={startTime} onChangeText={setStartTime} />
                    </View>
                    <View style={styles.timeInputWrapper}>
                        <Text style={styles.timeLabel}>{t('End Time')}</Text>
                        <TextInput style={styles.input} placeholder="18:00" placeholderTextColor="#94A3B8" value={endTime} onChangeText={setEndTime} />
                    </View>
                </View>

                <Text style={styles.fieldLabel}>{t('Available Days')}</Text>
                <View style={styles.chipRow}>
                    {DAYS.map(day => (
                        <TouchableOpacity key={day} style={[styles.chip, selectedDays[day] && styles.chipActive]} activeOpacity={0.8} onPress={() => toggleDay(day)}>
                            <Text style={[styles.chipText, selectedDays[day] && styles.chipTextActive]}>{t(DAY_LABELS[day])}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.fieldLabel}>{t('Certifications')}</Text>
                <View style={styles.chipRow}>
                    {CERTIFICATION_OPTIONS.map(cert => (
                        <TouchableOpacity key={cert} style={[styles.chip, selectedCertifications.includes(cert) && styles.chipActive]} activeOpacity={0.8} onPress={() => toggleChip(cert, selectedCertifications, setSelectedCertifications)}>
                            <Text style={[styles.chipText, selectedCertifications.includes(cert) && styles.chipTextActive]}>{t(cert)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.fieldLabel}>{t('Service Types')}</Text>
                <View style={styles.chipRow}>
                    {SERVICE_TYPE_OPTIONS.map(st => (
                        <TouchableOpacity key={st} style={[styles.chip, selectedServiceTypes.includes(st) && styles.chipActive]} activeOpacity={0.8} onPress={() => toggleChip(st, selectedServiceTypes, setSelectedServiceTypes)}>
                            <Text style={[styles.chipText, selectedServiceTypes.includes(st) && styles.chipTextActive]}>{t(st)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.fieldLabel}>{t('Date & Time')}</Text>
                <View style={styles.input}><Text style={styles.dateText}>{new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}</Text></View>

                {/* UPLOAD DOCUMENTS */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('Upload Documents')}</Text>
                <Text style={styles.sectionSub}>{t('Documents help us verify the suitability of the Pilot. Below is the list of mandatory documents. You can upload more if you want.')}</Text>

                <Text style={styles.docsNeededLabel}>{t('Documents Needed:')}</Text>
                {DOCUMENTS.map((doc) => {
                    const isChecked = !!checkedDocs[doc];
                    return (
                        <TouchableOpacity key={doc} style={styles.checkboxRow} activeOpacity={0.8} onPress={() => toggleDoc(doc)}>
                            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                {isChecked && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>{t(doc)} <Text style={styles.red}>*</Text></Text>
                        </TouchableOpacity>
                    );
                })}

                {uploadedDocs.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('Documents Uploaded')}</Text>
                        {uploadedDocs.map((doc) => (
                            <View key={doc} style={styles.docRow}>
                                <View style={styles.docIconBox}><Text style={styles.docIcon}>≡</Text></View>
                                <Text style={styles.docRowText}>{t(doc)}</Text>
                            </View>
                        ))}
                    </>
                )}

                <TouchableOpacity style={styles.addDocBtn} activeOpacity={0.85}>
                    <Text style={styles.addDocBtnText}>{t('Add New Document')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.addPilotBtn, (!allChecked || submitting) && styles.addPilotBtnDisabled]}
                    activeOpacity={allChecked && !submitting ? 0.85 : 1}
                    onPress={allChecked && !submitting ? handleAddPilot : undefined}
                    disabled={submitting}
                >
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addPilotBtnText}>{t('Add Pilot')}</Text>}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, gap: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 84 },

    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0B3A2C' },
    sectionSub: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 20, lineHeight: 18 },

    inviteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    inviteSlot: { alignItems: 'center', width: 42 },
    inviteChar: { fontSize: 28, fontWeight: '700', color: '#0B3A2C', minHeight: 36 },
    inviteUnderline: { height: 3, width: 36, backgroundColor: '#1E293B', borderRadius: 2 },
    hiddenInput: { height: 0, opacity: 0 },

    orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    orLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    orText: { marginHorizontal: 16, fontSize: 14, color: '#94A3B8' },

    fieldLabel: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginBottom: 8, marginTop: 14 },
    red: { color: '#C53030' },
    input: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 16, fontSize: 15, color: '#334155' },
    mobileRow: { flexDirection: 'row', gap: 10, zIndex: 10 },
    countryCodeBox: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 16, justifyContent: 'center', minWidth: 80 },
    countryCode: { fontSize: 15, color: '#334155' },
    mobileInput: { flex: 1 },
    countryPickerDropdown: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4, overflow: 'hidden', position: 'absolute', top: 108, left: 0, width: 140, zIndex: 100, elevation: 10 },
    countryPickerOption: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F6F8' },
    countryPickerOptionActive: { backgroundColor: '#E7F4EC' },
    countryPickerOptionText: { fontSize: 14, color: '#334155' },
    countryPickerOptionTextActive: { color: '#0B3A2C' },
    dateText: { fontSize: 15, color: '#334155' },
    timeRow: { flexDirection: 'row', gap: 12 },
    timeInputWrapper: { flex: 1 },
    timeLabel: { fontSize: 12, color: '#64748B', marginBottom: 4, marginTop: 0 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
    chipActive: { backgroundColor: '#0B3A2C', borderColor: '#0B3A2C' },
    chipText: { fontSize: 13, color: '#334155' },
    chipTextActive: { color: '#FFFFFF' },

    docsNeededLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 12, marginTop: 10 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#0B3A2C', borderColor: '#0B3A2C' },
    checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    checkboxLabel: { fontSize: 14, color: '#334155' },

    docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    docIconBox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    docIcon: { fontSize: 14, color: '#64748B' },
    docRowText: { fontSize: 14, color: '#334155' },

    addDocBtn: { borderWidth: 1.5, borderColor: '#94A3B8', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 8 },
    addDocBtnText: { fontSize: 14, fontWeight: '500', color: '#475569' },

    addPilotBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
    addPilotBtnDisabled: { backgroundColor: '#CBD5E1' },
    addPilotBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '500' },
});

export default AddPilotScreen;
