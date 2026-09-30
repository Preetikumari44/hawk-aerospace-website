import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const AddDroneConfirmationScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('Resources'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('Congratulations!')}</Text>
            <Text style={styles.subtitle}>{t('Your Drone is now a part of\nyour Fleet ✅')}</Text>
            <Text style={styles.quickActionsLabel}>{t('Some Quick actions for your Drone')}</Text>
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('Resources')}>
                    <Text style={styles.outlineBtnText}>{t('Assign Drone')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.85} onPress={() => onNavigate && onNavigate('YourDrones', { tab: 'Deployable' })}>
                    <Text style={styles.outlineBtnText}>{t('View Drone')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#072A20', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    title: { fontSize: 34, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
    subtitle: { fontSize: 24, color: '#FFFFFF', textAlign: 'center', lineHeight: 34, marginBottom: 32 },
    quickActionsLabel: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
    btnRow: { flexDirection: 'row', gap: 16 },
    outlineBtn: { borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 100, paddingVertical: 14, paddingHorizontal: 24 },
    outlineBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});

export default AddDroneConfirmationScreen;
