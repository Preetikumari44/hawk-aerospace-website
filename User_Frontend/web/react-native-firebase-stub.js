// React Native Firebase is native-only. The web build uses the web Firebase SDK.
export default function rnfbStub() {
  return {
    onMessage: () => () => {},
    onNotificationOpenedApp: () => () => {},
    getInitialNotification: () => Promise.resolve(null),
    getToken: () => Promise.resolve(null),
    requestPermission: () => Promise.resolve(0),
    onTokenRefresh: () => () => {},
  };
}
