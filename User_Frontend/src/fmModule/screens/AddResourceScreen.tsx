import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import DroneIcon from '../../assets/Missions-Inactive.svg';
import Svg, { Path, Circle } from 'react-native-svg';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, CenteredFormCard } from '../../common/DesktopLayouts';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const PilotFigureIcon = () => (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <Circle cx="14" cy="7" r="4.5" fill="#FFFFFF" />
        <Path d="M4 24c0-5.5 4.5-9 10-9s10 3.5 10 9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <Path d="M10 6h8l1 4H9L10 6z" fill="#FFFFFF" />
    </Svg>
);

const AddResourceScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('Resources'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    const isDesktop = useIsDesktop();
    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32, marginBottom: 0 }]}>
                    <TouchableOpacity onPress={() => onNavigate && onNavigate('Resources')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.sheetTitle}>{t('Add New Resource')}</Text>
                </View>}  >
                <CenteredFormCard >
                    <TouchableOpacity style={styles.bigBtn} onPress={() => onNavigate && onNavigate('AddDrone')}>
                        <DroneIcon width={28} height={28} fill="#FFFFFF" color="#FFFFFF" style={{ marginRight: 10 }} />
                        <Text style={styles.bigBtnText}>{t('Add Drone')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.bigBtn, { marginTop: 20 }]} onPress={() => onNavigate && onNavigate('AddPilot')}>
                        <PilotFigureIcon />
                        <Text style={[styles.bigBtnText, { marginLeft: 10 }]}>{t('Add Pilot')}</Text>
                    </TouchableOpacity>
                </CenteredFormCard>
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.sheetHandle} />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => onNavigate && onNavigate('Resources')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{t('Add New Resource')}</Text>
            </View>

            <TouchableOpacity
                style={styles.bigBtn}
                activeOpacity={0.85}
                onPress={() => onNavigate && onNavigate('AddDrone')}
            >
                <DroneIcon width={28} height={28} fill="#FFFFFF" color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.bigBtnText}>{t('Add Drone')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.bigBtn, { marginTop: 20 }]}
                activeOpacity={0.85}
                onPress={() => onNavigate && onNavigate('AddPilot')}
            >
                <PilotFigureIcon />
                <Text style={[styles.bigBtnText, { marginLeft: 10 }]}>{t('Add Pilot')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 20 },
    sheetHandle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 18 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    sheetTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 22 },
    bigBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '500' },
});

export default AddResourceScreen;
