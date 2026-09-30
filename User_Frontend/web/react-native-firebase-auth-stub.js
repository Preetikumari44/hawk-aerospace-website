// React Native Firebase auth is native-only. The web build authenticates
// through the `firebase/auth` web SDK (see src/utils/firebase.js), so the
// @react-native-firebase/auth module is resolved to this empty stub.
export default function rnfbAuthStub() {
  return null;
}
