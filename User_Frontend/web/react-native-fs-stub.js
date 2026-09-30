// react-native-fs is a native-only module (Android APK auto-update downloads).
// It dereferences NativeModules.RNFSManager at module init, which crashes in the
// browser. The web app never calls any RNFS API, so resolve it to this safe stub.
const RNFSFileTypeRegular = 0;
const RNFSFileTypeDirectory = 1;

const stub = {
  RNFSFileTypeRegular,
  RNFSFileTypeDirectory,
  CachesDirectoryPath: '',
  DocumentDirectoryPath: '',
  DownloadDirectoryPath: '',
  ExternalDirectoryPath: '',
  ExternalStorageDirectoryPath: '',
  TemporaryDirectoryPath: '',
  LibraryDirectoryPath: '',
  MainBundlePath: '',
  NSDocumentDirectory: '',
  downloadFile: () => ({
    promise: Promise.resolve({ statusCode: 0 }),
    jobId: 0,
  }),
  stopDownload: () => {},
  writeFile: async () => {},
  appendFile: async () => {},
  readFile: async () => '',
  readFileAssets: async () => '',
  unlink: async () => {},
  exists: async () => false,
  mkdir: async () => {},
  stat: async () => null,
  readDir: async () => [],
  copyFile: async () => {},
  moveFile: async () => {},
  uploadFiles: () => ({ promise: Promise.resolve({ statusCode: 0 }) }),
  getFSInfo: async () => null,
  hash: async () => '',
};

export default stub;
