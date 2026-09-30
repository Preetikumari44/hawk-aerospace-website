const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables with proper priority: .env.local > .env
const envFiles = [
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
];
envFiles.reverse().forEach(envFile => {
    if (fs.existsSync(envFile)) {
        dotenv.config({ path: envFile, override: true });
    }
});

module.exports = {
    entry: path.join(__dirname, 'index.web.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: process.env.WEB_PUBLIC_PATH || '/',
    },
    resolve: {
        extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js'],
        alias: {
            'react-native$': path.resolve(__dirname, 'web/react-native.js'),
            'react-native-maps': false,
            // Native-only modules resolved to empty web stubs. The web app
            // uses window.localStorage and the firebase/auth web SDK instead.
            '@react-native-community/async-storage$': path.resolve(__dirname, 'web/async-storage-stub.js'),
            '@react-native-firebase/app$': path.resolve(__dirname, 'web/react-native-firebase-stub.js'),
            '@react-native-firebase/auth$': path.resolve(__dirname, 'web/react-native-firebase-auth-stub.js'),
            '@react-native-firebase/messaging$': path.resolve(__dirname, 'web/react-native-firebase-stub.js'),
            '@react-native-firebase/database$': path.resolve(__dirname, 'web/react-native-firebase-stub.js'),
            'react-native-image-picker$': path.resolve(__dirname, 'web/react-native-image-picker-stub.js'),
            'react-native-fs$': path.resolve(__dirname, 'web/react-native-fs-stub.js'),
            'react-native-biometrics$': path.resolve(__dirname, 'web/react-native-biometrics-stub.js'),
            'react-native-razorpay$': path.resolve(__dirname, 'web/react-native-razorpay-stub.js'),
        },
    },
    module: {
        rules: [
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules\/(?!(react-native-vector-icons|react-native-calendars|react-native-svg|react-native-country-codes-picker|react-native-swipe-gestures|react-native-maps)\/).*/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [[
                            '@react-native/babel-preset',
                            { disableImportExportTransform: true }
                        ]
                        ],
                        sourceType: 'unambiguous'
                    },
                },
            },
            // SVGs rendered cleanly as React Components
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: '@svgr/webpack',
                        options: {
                            svgoConfig: {
                                plugins: [{ name: 'removeViewBox', active: false }],
                            },
                        },
                    },
                ],
            },
            // PNGs & JPGs automatically wrapped in { uri: ... } for React Native Web
            {
                test: /\.(png|jpe?g|gif)$/i,
                use: [
                    {
                        loader: path.resolve(__dirname, 'image-loader.js'),
                    },
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            name: 'images/[name].[ext]',
                            esModule: false,
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'public/index.html'),
        }),
        new webpack.DefinePlugin({
            'process.env.REACT_APP_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''),
            'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || ''),
            'process.env.REACT_APP_TEST_PHONE_NUMBERS': JSON.stringify(process.env.REACT_APP_TEST_PHONE_NUMBERS || '+919898989898,+919999999999,+919999999998,+918888888889,+918080808080,+918888888888,+918989898989'),
            'process.env': JSON.stringify({
                NODE_ENV: process.env.NODE_ENV || 'production',
                REACT_APP_GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
                REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '',
                REACT_APP_TEST_PHONE_NUMBERS: process.env.REACT_APP_TEST_PHONE_NUMBERS || '+919898989898,+919999999999,+919999999998,+918888888889,+918080808080,+918888888888,+918989898989',
            }),
        }),
    ],
    devServer: {
        port: 3002,
        hot: true,
        historyApiFallback: true,
    },
};
