import React from 'react';

// NATIVE-ONLY implementation (Android/iOS). Metro resolves this .native.jsx
// file for native platforms; the web bundle never includes it.
import NativeLinearGradient from 'react-native-linear-gradient';

// Diagonal start/end visually matches the web's 135deg CSS gradient.
const CrossPlatformGradient = ({ colors = ['#2B32B2', '#141852'], style, children, ...props }) => (
    <NativeLinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
        {...props}
    >
        {children}
    </NativeLinearGradient>
);

export default CrossPlatformGradient;
