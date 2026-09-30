import React from 'react';
import { View, StyleSheet } from 'react-native';

export const SplitPane: React.FC<{ left: React.ReactNode, right: React.ReactNode, leftRatio?: number }> = ({ left, right, leftRatio = 60 }) => (
    <View style={styles.container}>
        <View style={{ width: `${leftRatio}%`, paddingRight: 16 }}>{left}</View>
        <View style={{ width: `${100 - leftRatio}%`, paddingLeft: 16 }}>{right}</View>
    </View>
);

const styles = StyleSheet.create({ container: { flexDirection: 'row', width: '100%' } });