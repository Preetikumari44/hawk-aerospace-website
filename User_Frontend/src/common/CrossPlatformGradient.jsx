import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

const CrossPlatformGradient = ({ colors = ['#2B32B2', '#141852'], style, children, ...props }) => {
    if (Platform.OS === 'web') {
        // Convert React Native array to CSS linear-gradient string
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
    }

    // Fallback for native if library is removed, or re-plug native LinearGradient here if needed
    return (
        <View
            style={[
                style,
                { backgroundColor: colors[0] || '#2B32B2' }, // Solid fallback background
            ]}
            {...props}
        >
            {children}
        </View>
    );
};

export default CrossPlatformGradient;