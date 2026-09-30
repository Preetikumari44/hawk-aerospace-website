const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
  watchFolders: [__dirname],
  // Ignore problematic directories that cause file watcher errors
  watchman: {
    ignoreDirectories: [
      '**/node_modules/**/.cxx/**',
      '**/node_modules/**/.gradle/**',
      '**/node_modules/**/build/**',
      '**/android/.cxx/**',
      '**/android/.gradle/**',
      '**/android/app/build/**',
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);