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

import COLORS from '../constants/colors';
import CameraIcon from '../assets/Icons/CameraIconOutline.svg';
import { useLanguage } from '../../i18n';

/**
 * Cross-platform profile photo picker.
 * - Web: native `<input type="file">` → base64 data-URL (downscaled via canvas).
 * - Native: react-native-image-picker (camera + gallery) → base64 data-URL.
 * The data-URL is stored directly in the user's profile — no external bucket
 * or upload endpoint is used.
 */
const ProfilePhotoPicker = ({ value, onChange, size = 96 }) => {
  const { t } = useLanguage();
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleProcessingError = (error) => {
    console.error('Profile photo processing failed', error);
    const message = error?.message || t('Could not process the photo. Please try again.');
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert(t('Photo Failed'), message);
    }
  };

  const applyPhoto = (dataUrl) => {
    if (dataUrl) {
      onChange(dataUrl);
    }
  };

  const openWebPicker = () => {
    fileInputRef.current?.click();
  };

  const handleWebFileSelected = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      let dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read the selected image.'));
        reader.readAsDataURL(file);
      });
      dataUrl = await downscaleDataUrl(dataUrl);
      applyPhoto(dataUrl);
    } catch (error) {
      handleProcessingError(error);
    } finally {
      setProcessing(false);
    }
    event.target.value = '';
  };

  const handleNativeCamera = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error(t('Camera permission is required to take a photo.'));
        }
      }
      const { launchCamera } = require('react-native-image-picker');
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        includeBase64: true,
        maxWidth: 800,
        maxHeight: 800,
      });
      const asset = result?.assets?.[0];
      if (asset?.base64 || asset?.uri) {
        const dataUrl =
          asset.base64 != null
            ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
            : asset.uri;
        applyPhoto(dataUrl);
      }
    } catch (error) {
      handleProcessingError(error);
    }
  };

  const handleNativeLibrary = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        includeBase64: true,
        maxWidth: 800,
        maxHeight: 800,
        selectionLimit: 1,
      });
      const asset = result?.assets?.[0];
      if (asset?.base64 || asset?.uri) {
        const dataUrl =
          asset.base64 != null
            ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
            : asset.uri;
        applyPhoto(dataUrl);
      }
    } catch (error) {
      handleProcessingError(error);
    }
  };

  const handleNativePick = () => {
    if (Platform.OS === 'web') {
      openWebPicker();
      return;
    }

    Alert.alert(t('Profile Photo'), t('Choose an option'), [
      { text: t('Take Photo'), onPress: handleNativeCamera },
      { text: t('Upload from Library'), onPress: handleNativeLibrary },
      { text: t('Cancel'), style: 'cancel' },
    ]);
  };

  const renderAvatar = () => {
    if (value) {
      return <Image source={{ uri: value }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
    }
    return (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <CameraIcon width={size * 0.34} height={size * 0.34} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleNativePick} style={styles.avatarWrapper} disabled={processing}>
        {processing ? (
          <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : (
          renderAvatar()
        )}
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>{t('Edit')}</Text>
        </View>
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={handleNativePick} disabled={processing}>
          <Text style={styles.actionText}>{t('Take Photo / Upload')}</Text>
        </Pressable>
      </View>

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

/**
 * Downsizes an image data-URL on the web so the stored base64 stays small
 * enough to live inside a Firestore document. Falls back to the original on
 * any failure.
 */
async function downscaleDataUrl(dataUrl, maxSize = 800, quality = 0.7) {
  try {
    if (typeof window === 'undefined' || !window.Image || !document.createElement) {
      return dataUrl;
    }

    const image = await new Promise((resolve, reject) => {
      const img = new window.Image();
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

    const canvas = document.createElement('canvas');
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
  container: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    backgroundColor: '#5060D3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#A5B4FC',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
  },
  editBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#C7CEF9',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfilePhotoPicker;
