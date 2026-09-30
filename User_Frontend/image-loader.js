// image-loader.js
// Wraps Webpack image URLs into React Native Web compatible { uri: '...' } objects
module.exports = function (content) {
    return content.replace(
        /module\.exports\s*=\s*(.*);?$/s,
        'var url = $1; module.exports = { uri: url, default: { uri: url } };'
    );
};