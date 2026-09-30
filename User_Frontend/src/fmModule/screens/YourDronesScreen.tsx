import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import DroneListCard from '../components/DroneListCard';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const TABS: Array<'Deployable' | 'Assigned' | 'Maintenance'> = ['Deployable', 'Assigned', 'Maintenance'];

const YourDronesScreen: React.FC<{ onNavigate?: any; initialTab?: 'Deployable' | 'Assigned' | 'Maintenance' }> = ({ onNavigate, initialTab }) => {
    const [activeTab, setActiveTab] = useState<'Deployable' | 'Assigned' | 'Maintenance'>(initialTab || 'Deployable');
    const [drones, setDrones] = useState<any[]>([]);
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

    const statusLabel: Record<string, 'Deployable' | 'Assigned' | 'Under Maintenance'> = {
        Deployable: 'Deployable',
        Assigned: 'Assigned',
        Maintenance: 'Under Maintenance',
    };

    useEffect(() => {
        fleetApi.getDrones().then((data: any) => {
            const items = Array.isArray(data) ? data : data?.items || data?.data || [];
            setDrones(items);
        }).catch((error: any) => console.error('Failed to load fleet drones', error));
    }, []);

    const filteredDrones = useMemo(() => {
        return drones.filter((drone) => {
            const status = String(drone?.status || drone?.availability || '').toLowerCase();
            if (activeTab === 'Deployable') return status.includes('deployable') || status.includes('available') || status.includes('active');
            if (activeTab === 'Assigned') return status.includes('assigned') || status.includes('busy');
            return status.includes('maintenance');
        });
    }, [activeTab, drones]);

    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate && onNavigate('Resources')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Your Drones')}</Text>
                </View>} >
                <View style={[styles.tabContainer, { paddingHorizontal: 0, width: 400, marginBottom: 24 }]}>
                    <View style={styles.tabPillWrapper}>
                        {TABS.map((tab) => (
                            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{t(tab)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Drones render as wide table rows due to the component's internal desktop check */}
                <View style={{ gap: 12 }}>
                    {filteredDrones.map((drone, idx) => (
                        <DroneListCard key={idx} status={statusLabel[activeTab]} drone={drone} onPress={() => onNavigate && onNavigate('DroneDetails', { status: activeTab, drone })} />
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
                <Text style={styles.pageTitle}>{t('Your Drones')}</Text>
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
                {filteredDrones.map((drone, idx) => (
                    <DroneListCard
                        key={idx}
                        status={statusLabel[activeTab]}
                        drone={drone}
                        onPress={() => onNavigate && onNavigate('DroneDetails', { status: activeTab, drone })}
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

export default YourDronesScreen;
