// react-native-biometrics is a native-only module. The web app must never
// call native biometric APIs (biometrics is only available in the Android/iOS
// app), so the module is resolved to this stub for the web build.
class ReactNativeBiometricsStub {
  async isSensorAvailable() {
    return { available: false };
  }

  async createKeys() {
    return { publicKey: '' };
  }

  async biometricKeysExist() {
    return { keysExist: false };
  }

  async deleteKeys() {
    return { keysDeleted: false };
  }

  async createSignature() {
    return { success: false };
  }

  async simplePrompt() {
    return { success: false };
  }
}

export default ReactNativeBiometricsStub;
export const TouchID = 'TouchID';
export const FaceID = 'FaceID';
export const Biometrics = 'Biometrics';
export const BiometryTypes = { TouchID, FaceID, Biometrics };