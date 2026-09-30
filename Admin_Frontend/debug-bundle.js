#!/usr/bin/env node

/**
 * Debug Bundle Issues
 * This script helps identify syntax errors in the webpack bundle
 */

const webpack = require('webpack');
const config = require('./webpack.config.js');

console.log('🔍 Starting webpack bundle analysis...\n');

const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.error('❌ Webpack compilation error:');
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    process.exit(1);
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    console.error('❌ Bundle Errors:\n');
    info.errors.forEach((error, index) => {
      console.error(`\nError ${index + 1}:`);
      console.error(error.message);
      if (error.details) {
        console.error('Details:', error.details);
      }
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    });
  }

  if (stats.hasWarnings()) {
    console.warn('\n⚠️  Bundle Warnings:\n');
    info.warnings.forEach((warning, index) => {
      console.warn(`\nWarning ${index + 1}:`);
      console.warn(warning.message);
    });
  }

  if (!stats.hasErrors() && !stats.hasWarnings()) {
    console.log('✅ Bundle compiled successfully!');
    console.log(`\nBundle size: ${(info.assets[0].size / 1024).toFixed(2)} KB`);
    console.log(`Output: ${info.assets[0].name}`);
  }

  compiler.close((closeErr) => {
    if (closeErr) {
      console.error('Error closing compiler:', closeErr);
    }
  });
});
