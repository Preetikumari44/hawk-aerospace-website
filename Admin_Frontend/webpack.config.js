const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables with proper priority
// Priority: .env.local > .env.production > .env
const envFiles = [
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env.production'),
  path.resolve(__dirname, '.env'),
];

// Load all env files in order with proper priority
// Priority: .env.local > .env.production > .env
// We load in reverse order and use override to ensure .env.local wins
envFiles.reverse().forEach(envFile => {
  if (fs.existsSync(envFile)) {
    // Use override:true to ensure .env files override any existing env vars
    dotenv.config({ path: envFile, override: true });
  }
});

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    target: 'web',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
    entry: path.join(__dirname, 'index.web.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'bundle.[contenthash:8].js' : 'bundle.web.js',
      publicPath: '/',
      clean: true
    },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js)$/,
        exclude: function(modulePath) {
          return /node_modules/.test(modulePath) &&
            !/node_modules\/react-native-vector-icons/.test(modulePath) &&
            !/node_modules\/react-native-render-html/.test(modulePath) &&
            !/node_modules\/@react-navigation/.test(modulePath) &&
            !/node_modules\/@react-native/.test(modulePath) &&
            !/node_modules\/react-native-safe-area-context/.test(modulePath) &&
            !/node_modules\/react-native-screens/.test(modulePath) &&
            !/node_modules\/react-native-gesture-handler/.test(modulePath) &&
            !/node_modules\/react-native-reanimated/.test(modulePath) &&
            !/node_modules\/react-native-worklets/.test(modulePath) &&
            !/node_modules\/@react-native-async-storage/.test(modulePath);
        },
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,       
            configFile: false,    
            sourceType: 'unambiguous',
            compact: isProduction,
            presets: [
              ['@babel/preset-env', { modules: false }], 
              ['@babel/preset-react', { runtime: 'automatic' }]
            ],
            plugins: [
              // Force the plugin to explicitly handle TSX extensions
              ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true }],
              '@babel/plugin-proposal-export-namespace-from',
              'react-native-reanimated/plugin'
            ],
          },
        },
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // ------------------------------------------------------
      // Dedicated SVGR rule for handling SVG as React Components
      // ------------------------------------------------------
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              native: true, // Emits elements compatible with react-native-svg
            },
          },
        ],
      },
      // ------------------------------------------------------
      // Images Rule (Removed .svg extension from here)
      // ------------------------------------------------------
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
            options: { escalateStyles: false }
          },
        ],
      },
    ],
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      '@env': false, // Ignore @env in web builds (React Native only)
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.web.jsx', '.jsx', '.json'],
    mainFields: ['browser', 'module', 'main'],
    fallback: {
      "crypto": false,
      "stream": false,
      "buffer": false,
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public/index.html'),
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(!isProduction),
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      // Inject environment variables at build time
      // DefinePlugin does literal string replacement in the bundle
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || ''),
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || ''),
      'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL || ''),
      'process.env.REACT_APP_ENV': JSON.stringify(process.env.REACT_APP_ENV || 'development'),
    }),
  ],
  optimization: {
    minimize: isProduction,
    splitChunks: isProduction ? {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    } : false,
  },
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  devServer: {
    port: 3002,
    historyApiFallback: true,
    hot: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
};
};