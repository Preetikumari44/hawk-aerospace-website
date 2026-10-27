import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 blocks dev-server resources (HMR) for any origin other than
  // localhost, which stops the login page from hydrating when it is opened
  // via 127.0.0.1 or a LAN address. Dev-only; has no effect on `next start`.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  turbopack: {
    root,
    resolveAlias: {
      "react-native": "react-native-web",
    },
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native$": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ...config.resolve.extensions,
    ];

    // SVGR support (the supplied Pilot dashboard imports .svg files as React
    // components) — official Next.js recipe: keep the default file-loader
    // rule available via `?url`, route every other .svg import through
    // @svgr/webpack instead.
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.(".svg"));
    if (fileLoaderRule) {
      config.module.rules.push(
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/,
        },
        {
          test: /\.svg$/i,
          issuer: fileLoaderRule.issuer,
          resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not ?? []), /url/] },
          use: ["@svgr/webpack"],
        },
      );
      fileLoaderRule.exclude = /\.svg$/i;
    }

    return config;
  },
  transpilePackages: [
    "react-native",
    "react-native-web",
    "react-native-svg",
    "react-native-gesture-handler",
    "react-native-safe-area-context",
    "react-native-screens",
    "@react-navigation/native",
    "@react-navigation/native-stack",
    "@react-navigation/elements",
  ],
};

export default nextConfig;
