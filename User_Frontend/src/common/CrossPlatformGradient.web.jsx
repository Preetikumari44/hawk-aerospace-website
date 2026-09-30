import React from 'react';
import { View } from 'react-native';

// WEB-ONLY implementation (.web.jsx wins over .jsx in the webpack resolution).
// Converts the React Native color array to a CSS linear-gradient string.
const CrossPlatformGradient = ({ colors = ['#2B32B2', '#141852'], style, children, ...props }) => {
    const cssGradient = `linear-gradient(135deg, ${colors.join(', ')})`;
    return (
        <View
            style={[
                style,
                {
                    backgroundImage: cssGradient,
                },
            ]}
            {...props}
        >
            {children}
        </View>
    );
};

export default CrossPlatformGradient;
