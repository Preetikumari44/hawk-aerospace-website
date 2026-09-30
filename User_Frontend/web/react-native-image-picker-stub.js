// Stub for react-native-image-picker on web
// On web, image upload is handled via HTML <input type="file">
export const launchCamera = () => Promise.resolve({ didCancel: true });
export const launchImageLibrary = () => Promise.resolve({ didCancel: true });
export default {
  launchCamera,
  launchImageLibrary,
};
