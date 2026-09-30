import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import CalendarIcon from '../../assets/calendar.svg';
import ClockIcon from '../../assets/clock.svg';
import LocationPinIcon from '../../assets/location-pin.svg';
import AvatarIcon from '../../assets/Avatar.svg';
import { useIsDesktop } from '../../utils/responsive';
import { useLanguage } from '../../i18n';

interface MissionHistoryCardProps {
    personLabel?: string;
    onViewDetails?: () => void;
}

const MissionHistoryCard: React.FC<MissionHistoryCardProps> = ({ personLabel = 'Vivek Kumar (PLT-123456)', onViewDetails }) => {
    const isDesktop = useIsDesktop();
    const { t, locale } = useLanguage();
    if (isDesktop) {
        return (
            <View style={[styles.card, { width: '100%' }]}>
                {/* Desktop keeps the same internal JSX but ensures it takes 100% of its grid cell */}
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Land Mapping</Text>
                    <TouchableOpacity onPress={onViewDetails}><Text style={styles.linkText}>{t('View Details')}</Text></TouchableOpacity>
                </View>
                <View style={styles.iconDataRow}><RupeeIcon width={15} height={15} fill="#64748B" style={styles.rowIcon} /><Text style={styles.grayRowText}>{t('Commission: ')}<Text style={styles.boldDark}>5,000</Text></Text></View>
                <View style={styles.iconDataRow}><CalendarIcon width={15} height={15} fill="#64748B" style={styles.rowIcon} /><Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.boldDark}>26 May 2026</Text></Text></View>
                <View style={styles.iconDataRow}><ClockIcon width={15} height={15} fill="#64748B" style={styles.rowIcon} /><Text style={styles.grayRowText}>{t('Time: ')}<Text style={styles.boldDark}>10 AM - 12 PM</Text></Text></View>
                <View style={styles.iconDataRow}><LocationPinIcon width={15} height={15} fill="#64748B" style={styles.rowIcon} /><Text style={styles.grayRowText} numberOfLines={1}>Plot 06, Sector 21, Vashi</Text></View>
                <View style={styles.iconDataRow}><AvatarIcon width={15} height={15} style={styles.rowIcon} /><Text style={styles.grayRowText} numberOfLines={1}>{personLabel}</Text></View>
            </View>
        );
    }
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Land Mapping</Text>
                <TouchableOpacity onPress={onViewDetails}><Text style={styles.linkText}>{t('View Details')}</Text></TouchableOpacity>
            </View>
            <View style={styles.iconDataRow}>
                <RupeeIcon width={15} height={15} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Commission: ')}<Text style={styles.boldDark}>5,000</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <CalendarIcon width={15} height={15} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Date: ')}<Text style={styles.boldDark}>26 May 2026</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <ClockIcon width={15} height={15} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText}>{t('Time: ')}<Text style={styles.boldDark}>10 AM - 12 PM</Text></Text>
            </View>
            <View style={styles.iconDataRow}>
                <LocationPinIcon width={15} height={15} fill="#64748B" color="#64748B" style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>Plot 06, Sector 21, Vashi, Navi Mumbai, 431647</Text>
            </View>
            <View style={styles.iconDataRow}>
                <AvatarIcon width={15} height={15} style={styles.rowIcon} />
                <Text style={styles.grayRowText} numberOfLines={1}>{personLabel}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#CBD5E1', padding: 24, marginBottom: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '500', color: '#0B3A2C' },
    linkText: { fontSize: 14, fontWeight: '500', color: '#0B3A2C' },
    iconDataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    rowIcon: { marginRight: 8 },
    grayRowText: { fontSize: 15, color: '#64748B', flex: 1 },
    boldDark: { fontWeight: '500', color: '#1E293B' },
});

export default MissionHistoryCard;