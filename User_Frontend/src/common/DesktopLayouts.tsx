import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';

export const DesktopPageShell: React.FC<{ children: React.ReactNode; header?: React.ReactNode; style?: ViewStyle }> = ({ children, header, style }) => (
    <View style={styles.shell}>
        {header}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.shellContent, style]}>
            {children}
        </ScrollView>
    </View>
);

export const SplitPane: React.FC<{ left: React.ReactNode; right: React.ReactNode; leftWeight?: number; rightWeight?: number }> = ({ left, right, leftWeight = 6, rightWeight = 4 }) => (
    <View style={styles.splitPane}>
        <View style={{ flex: leftWeight, paddingRight: 24 }}>{left}</View>
        <View style={{ flex: rightWeight, paddingLeft: 24 }}>{right}</View>
    </View>
);

export const ResponsiveGrid: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
    <View style={[styles.grid, style]}>{children}</View>
);

export const CenteredFormCard: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
    <View style={styles.formContainer}>
        <View style={styles.formCard}>
            {children}
        </View>
    </View>
);

const styles = StyleSheet.create({
    shell: { flex: 1, backgroundColor: '#F7F7F7', alignItems: 'center' },
    shellContent: { width: '100%', maxWidth: 1280, padding: 32 },
    splitPane: { flexDirection: 'row', width: '100%', alignItems: 'flex-start' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, width: '100%' },
    formContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    formCard: { width: '100%', maxWidth: 640, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#E4E3EA' },
});