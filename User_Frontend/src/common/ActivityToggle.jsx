import React, { useRef, useEffect } from 'react';
import { View, TouchableWithoutFeedback, Animated, StyleSheet } from 'react-native';

const ActivityToggle = ({ isActive, onToggle }) => {
    // Use React Native's Animated API for physics-based spring transitions
    const slideAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isActive ? 1 : 0,
            stiffness: 700,
            damping: 27,
            mass: 1,
            useNativeDriver: false, // Required false for animating background colors
        }).start();
    }, [isActive]);

    // Interpolations
    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, 32], // Total width (60) - Thumb width (24) - Left/Right Padding (4)
    });

    const backgroundColor = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#D1D5DB', '#10B981'], // Gray -> Green
    });

    return (
        <TouchableWithoutFeedback onPress={() => onToggle(!isActive)}>
            <Animated.View style={[styles.track, { backgroundColor }]}>
                <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    track: {
        width: 60,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
});

export default ActivityToggle;