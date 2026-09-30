import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CardIcon from '../../assets/CardView.svg';
import { useIsDesktop } from '../../utils/responsive';
import { useLanguage } from '../../i18n';

interface OverviewStatCardProps {
    title: string;
    value: string;
    valueColor?: string;
    onPress?: () => void;
}

const OverviewStatCard: React.FC<OverviewStatCardProps> = ({ title, value, valueColor = '#1E293B', onPress }) => {
    const isDesktop = useIsDesktop();
    const { t, locale } = useLanguage();
    if (isDesktop) {
        return (
            <TouchableOpacity
                style={[styles.overviewCard, { width: '100%', marginBottom: 0 }]}
                activeOpacity={onPress ? 0.85 : 1}
                onPress={onPress} disabled={!onPress}
            >
                <View style={styles.cardHeader}>
                    <CardIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.cardIcon} />
                    <Text style={styles.cardTitle}>{t(title)}</Text>
                </View>
                <Text style={[styles.cardValue, { color: valueColor }]}>{value}</Text>
            </TouchableOpacity>
        );
    }
    return (
        <TouchableOpacity style={styles.overviewCard} activeOpacity={onPress ? 0.85 : 1} onPress={onPress} disabled={!onPress}>
            <View style={styles.cardHeader}>
                <CardIcon width={16} height={16} fill="#64748B" color="#64748B" style={styles.cardIcon} />
                <Text style={styles.cardTitle}>{t(title)}</Text>
            </View>
            <Text style={[styles.cardValue, { color: valueColor }]}>{value}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    overviewCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardIcon: { marginRight: 6 },
    cardTitle: { fontSize: 13, color: '#64748B', textDecorationLine: 'underline' },
    cardValue: { fontSize: 28, fontWeight: '500', color: '#1E293B' },
});

export default OverviewStatCard;