import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { useLanguage } from '../i18n';

interface MediaUploadFieldProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * Reusable "take photo or upload" media field. Produces a base64 data-URL that
 * is stored directly (no external storage bucket).
 */
const MediaUploadField: React.FC<MediaUploadFieldProps> = ({
  value,
  onChange,
  label,
  required,
}) => {
  const { t } = useLanguage();
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<any>(null);

  const handleError = (error: any) => {
    console.error('Media processing failed', error);
    const message = error?.message || t('Could not process the media. Please try again.');
    if (Platform.OS === 'web') {
      (globalThis as any).window?.alert(message);
    } else {
      Alert.alert(t('Media Failed'), message);
    }
  };

  const handleWebFileSelected = async (event: any) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const FileReaderCtor = (globalThis as any).FileReader;
      let dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReaderCtor();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read the selected image.'));
        reader.readAsDataURL(file);
      });
      dataUrl = await downscaleDataUrl(dataUrl);
      onChange(dataUrl);
    } catch (error) {
      handleError(error);
    } finally {
      setProcessing(false);
    }
    event.target.value = '';
  };

  const openWebPicker = () => fileInputRef.current?.click();

  const handleNativeCamera = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error(t('Camera permission is required to take a photo.'));
        }
      }
      const { launchCamera } = require('react-native-image-picker');
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        includeBase64: true,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      const asset = result?.assets?.[0];
      if (asset?.base64 != null) {
        onChange(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
      } else if (asset?.uri) {
        onChange(asset.uri);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleNativeLibrary = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        includeBase64: true,
        maxWidth: 1200,
        maxHeight: 1200,
        selectionLimit: 1,
      });
      const asset = result?.assets?.[0];
      if (asset?.base64 != null) {
        onChange(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);
      } else if (asset?.uri) {
        onChange(asset.uri);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handlePress = () => {
    if (Platform.OS === 'web') {
      openWebPicker();
      return;
    }
    Alert.alert(t('Upload Media'), t('Choose an option'), [
      { text: t('Take Photo'), onPress: handleNativeCamera },
      { text: t('Upload from Library'), onPress: handleNativeLibrary },
      { text: t('Cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label || t('Upload Media')}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      {value ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
          <Pressable style={styles.removeBtn} onPress={() => onChange('')} hitSlop={10}>
            <Text style={styles.removeText}>{t('Remove')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={[styles.uploadBox, processing && styles.uploadBoxDisabled]} onPress={handlePress} disabled={processing}>
          {processing ? (
            <ActivityIndicator size="small" color="#5060D3" />
          ) : (
            <>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTextDark}>{t('Click to capture or upload image')}</Text>
              <Text style={styles.uploadTextLight}>{t('JPG / PNG')}</Text>
            </>
          )}
        </Pressable>
      )}

      {Platform.OS === 'web' &&
        React.createElement('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: handleWebFileSelected,
        })}
    </View>
  );
};

async function downscaleDataUrl(dataUrl: string, maxSize = 1200, quality = 0.7) {
  try {
    const g = globalThis as any;
    if (!g.window || !g.window.Image || !g.document?.createElement) {
      return dataUrl;
    }
    const image = await new Promise<any>((resolve, reject) => {
      const img = new g.window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load failed'));
      img.src = dataUrl;
    });
    let { width, height } = image;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    if (scale < 1) {
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = g.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  required: { color: '#EF4444' },
  uploadBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 14,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  uploadBoxDisabled: { opacity: 0.6 },
  uploadIcon: { fontSize: 26 },
  uploadTextDark: { fontSize: 14, color: '#374151', fontWeight: '500' },
  uploadTextLight: { fontSize: 12, color: '#9CA3AF' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { width: 96, height: 96, borderRadius: 14 },
  removeBtn: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  removeText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
});

export default MediaUploadField;
