import { Platform, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { getApiBaseUrl } from './api';

const FALLBACK_VERSION_CODE = 12;

const getCurrentVersionCode = async () => {
  if (Platform.OS === 'android') {
    try {
      const { ApkInstaller } = NativeModules;
      if (ApkInstaller && ApkInstaller.getInstalledVersionCode) {
        const versionCode = await ApkInstaller.getInstalledVersionCode();
        if (typeof versionCode === 'number' && versionCode > 0) {
          return versionCode;
        }
      }
    } catch (e) {
      console.log('[UpdateChecker] Version check error, using fallback:', e);
    }
  }
  return FALLBACK_VERSION_CODE;
};

export const checkForUpdate = async () => {
  // APK download/install is Android-only. Never check for updates on web or iOS.
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const currentVersionCode = await getCurrentVersionCode();
    const baseUrl = await getApiBaseUrl();
    const response = await fetch(`${baseUrl}/update/latest`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    const latest = data?.data || data;

    if (!latest || !latest.downloadUrl) {
      return null;
    }

    if (latest.versionCode > currentVersionCode) {
      return {
        versionCode: latest.versionCode,
        versionName: latest.versionName,
        downloadUrl: latest.downloadUrl,
        releaseNotes: latest.releaseNotes || 'New version available',
        forceUpdate: latest.forceUpdate === true,
      };
    }

    return null;
  } catch (error) {
    console.log('[UpdateChecker] Failed to check for update:', error);
    return null;
  }
};

export const downloadApk = async (_downloadUrl, onProgress) => {
  const baseUrl = await getApiBaseUrl();
  const proxyUrl = `${baseUrl}/update/download`;
  const destPath = `${RNFS.CachesDirectoryPath}/update-${Date.now()}.apk`;

  const result = await RNFS.downloadFile({
    fromUrl: proxyUrl,
    toFile: destPath,
    progressDivider: 5,
    progress: (res) => {
      if (onProgress) {
        const progress = res.bytesWritten / res.contentLength;
        onProgress(Math.min(progress, 1));
      }
    },
  }).promise;

  if (result.statusCode === 200) {
    return destPath;
  }

  throw new Error(`Download failed with status ${result.statusCode}`);
};

export const installApk = async (filePath) => {
  if (Platform.OS !== 'android') {
    throw new Error('APK installation is only supported on Android');
  }

  const { ApkInstaller } = NativeModules;
  if (!ApkInstaller) {
    throw new Error('ApkInstaller native module not available. Rebuild the app.');
  }

  return ApkInstaller.installApk(filePath);
};
