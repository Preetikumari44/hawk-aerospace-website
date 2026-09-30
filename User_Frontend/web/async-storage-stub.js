// Web builds never use native async-storage (window.localStorage is used in
// src/utils/storage.js), so the legacy @react-native-community/async-storage
// fallback is resolved to this empty stub instead of failing to resolve.
const stub = {
  setItem: async () => undefined,
  getItem: async () => null,
  removeItem: async () => undefined,
  clear: async () => undefined,
  getAllKeys: async () => [],
  multiSet: async () => undefined,
  multiGet: async () => [],
  multiRemove: async () => undefined,
};

export default stub;
