import { Platform } from 'react-native';

const memoryStorage = {};

let AsyncStorage = null;
if (Platform.OS !== 'web') {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch {
    try {
      AsyncStorage = require('@react-native-community/async-storage').default;
    } catch {
      AsyncStorage = null;
    }
  }
}

const isWeb = Platform.OS === 'web';

export const Storage = {
  setItem: async (key, value) => {
    if (isWeb && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else if (AsyncStorage) {
      await AsyncStorage.setItem(key, value);
    } else {
      memoryStorage[key] = value;
    }
  },
  getItem: async (key) => {
    if (isWeb && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (AsyncStorage) {
      return AsyncStorage.getItem(key);
    }
    return memoryStorage[key] || null;
  },
  removeItem: async (key) => {
    if (isWeb && window.localStorage) {
      window.localStorage.removeItem(key);
    } else if (AsyncStorage) {
      await AsyncStorage.removeItem(key);
    } else {
      delete memoryStorage[key];
    }
  },
  clearAll: async () => {
    if (isWeb && window.localStorage) {
      window.localStorage.clear();
    } else if (AsyncStorage) {
      await AsyncStorage.clear();
    } else {
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    }
  },
};
