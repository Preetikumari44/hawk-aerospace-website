import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import PilotListCard from '../components/PilotListCard';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const TABS: Array<'Available' | 'Assigned' | 'Off-Duty'> = ['Available', 'Assigned', 'Off-Duty'];

const YourPilotsScreen: React.FC<{ onNavigate?: any; initialTab?: 'Available' | 'Assigned' | 'Off-Duty' }> = ({ onNavigate, initialTab }) => {
    const [activeTab, setActiveTab] = useState<'Available' | 'Assigned' | 'Off-Duty'>(initialTab || 'Available');
    const [pilots, setPilots] = useState<any[]>([]);
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();

    useEffect(() => {
        const onBackPress = () => {
            onNavigate && onNavigate('Resources');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    useEffect(() => {
        fleetApi.getPilots().then((data: any) => {
            const items = Array.isArray(data) ? data : data?.items || data?.data || [];
            setPilots(items);
        }).catch((error: any) => console.error('Failed to load fleet pilots', error));
    }, []);

    const filteredPilots = useMemo(() => {
        return pilots.filter((pilot) => {
            const status = String(pilot?.status || pilot?.availability || '').toLowerCase();
            if (!status) return activeTab === 'Available';
            if (activeTab === 'Available') return status.includes('available') || status.includes('active') || status.includes('pending');
            if (activeTab === 'Assigned') return status.includes('assigned') || status.includes('busy');
            return status.includes('off') || status.includes('inactive') || status.includes('duty');
        });
    }, [activeTab, pilots]);

    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Resources')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Your Pilots')}</Text>
                </View>}  >
                <View style={[styles.tabContainer, { paddingHorizontal: 0, width: 400, marginBottom: 24 }]}>
                    <View style={styles.tabPillWrapper}>
                        {TABS.map((tab) => (
                            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{t(tab)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={{ gap: 12 }}>
                    {filteredPilots.map((pilot, idx) => (
                        <PilotListCard key={idx} status={activeTab} pilot={pilot} showPhone={true} onPress={() => onNavigate && onNavigate('PilotDetails', { status: activeTab, pilot })} />
                    ))}
                </View>
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Resources')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Your Pilots')}</Text>
            </View>

            <View style={styles.tabContainer}>
                <View style={styles.tabPillWrapper}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                                onPress={() => setActiveTab(tab)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{t(tab)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
                {filteredPilots.map((pilot, idx) => (
                    <PilotListCard
                        key={idx}
                        status={activeTab}
                        pilot={pilot}
                        showPhone={activeTab !== 'Off-Duty' ? true : true}
                        onPress={() => onNavigate && onNavigate('PilotDetails', { status: activeTab, pilot })}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },

    tabContainer: { paddingHorizontal: 20, marginBottom: 24, marginTop: 8 },
    tabPillWrapper: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 100, padding: 4, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
    tabBtnActive: { backgroundColor: '#1E293B' },
    tabBtnText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
    tabBtnTextActive: { color: '#FFFFFF' },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 84 },
});

export default YourPilotsScreen;
