import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, BackHandler, TextInput, ActivityIndicator,
} from 'react-native';
import { useIsDesktop } from '../../utils/responsive';
import { DesktopPageShell, CenteredFormCard } from '../../common/DesktopLayouts';
import { fleetApi } from '../../utils/api';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const DRONE_TYPES = ['videography', 'mapping', 'monitoring', 'spraying', 'surveillance', 'seeding'] as const;

const AddDroneScreen: React.FC<{ onNavigate?: any }> = ({ onNavigate }) => {
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();
    const [model, setModel] = useState('');
    const [serialNo, setSerialNo] = useState('');
    const [type, setType] = useState<string>('spraying');
    const [submitting, setSubmitting] = useState(false);
    const [showTypePicker, setShowTypePicker] = useState(false);

    useEffect(() => {
        const onBackPress = () => { onNavigate && onNavigate('AddResource'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => backHandler.remove();
    }, [onNavigate]);

    const handleSubmit = async () => {
        if (!model.trim() || !serialNo.trim()) return;
        setSubmitting(true);
        try {
            await fleetApi.createDrone({
                model: model.trim(),
                serialNo: serialNo.trim().toUpperCase(),
                type,
            });
            onNavigate && onNavigate('AddDroneConfirmation');
        } catch (err) {
            console.error('Failed to create drone', err);
        } finally {
            setSubmitting(false);
        }
    };

    const isDesktop = useIsDesktop();

    const renderFormFields = () => (
        <>
            <Text style={styles.fieldLabel}>{t('Drone Model *')}</Text>
            <TextInput style={styles.input} placeholder={t('e.g., DJI Mavrick 1050')} placeholderTextColor="#94A3B8" value={model} onChangeText={setModel} />

            <Text style={styles.fieldLabel}>{t('Serial Number *')}</Text>
            <TextInput style={styles.input} placeholder={t('e.g., DRN-MH05-123456')} placeholderTextColor="#94A3B8" value={serialNo} onChangeText={setSerialNo} autoCapitalize="characters" />

            <Text style={styles.fieldLabel}>{t('Drone Type *')}</Text>
            <TouchableOpacity style={styles.pickerBtn} activeOpacity={0.8} onPress={() => setShowTypePicker(!showTypePicker)}>
                <Text style={[styles.pickerBtnText, !type && { color: '#94A3B8' }]}>{type ? t(type) : t('Select type')}</Text>
                <Text style={styles.pickerArrow}>{showTypePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showTypePicker && (
                <View style={styles.pickerDropdown}>
                    {DRONE_TYPES.map((droneType) => (
                        <TouchableOpacity key={droneType} style={[styles.pickerOption, type === droneType && styles.pickerOptionActive]} onPress={() => { setType(droneType); setShowTypePicker(false); }}>
                            <Text style={[styles.pickerOptionText, type === droneType && styles.pickerOptionTextActive]}>{t(droneType)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <TouchableOpacity style={[styles.submitBtn, (submitting || !model.trim() || !serialNo.trim()) && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting || !model.trim() || !serialNo.trim()}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>{t('Submit')}</Text>}
            </TouchableOpacity>
        </>
    );

    if (isDesktop) {
        return (
            <DesktopPageShell
                header={<View style={[styles.headerRow, { maxWidth: 1280, width: '100%', alignSelf: 'center', paddingHorizontal: 32 }]}>
                    <TouchableOpacity onPress={() => onNavigate && onNavigate('AddResource')}><Text style={styles.backArrow}>←</Text></TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Add New Drone')}</Text>
                </View>}>
                <CenteredFormCard>{renderFormFields()}</CenteredFormCard>
            </DesktopPageShell>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => onNavigate && onNavigate('AddResource')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Add New Drone')}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>
                {renderFormFields()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, gap: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 84 },
    fieldLabel: { fontSize: 15, fontWeight: '500', color: '#1E293B', marginBottom: 8, marginTop: 16 },
    red: { color: '#C53030' },
    input: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 16, fontSize: 15, color: '#334155' },
    pickerBtn: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerBtnText: { fontSize: 15, color: '#334155' },
    pickerArrow: { fontSize: 12, color: '#64748B' },
    pickerDropdown: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8, overflow: 'hidden' },
    pickerOption: { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F4F6F8' },
    pickerOptionActive: { backgroundColor: '#E7F4EC' },
    pickerOptionText: { fontSize: 15, color: '#334155' },
    pickerOptionTextActive: { color: '#0B3A2C' },
    submitBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 18, alignItems: 'center', marginTop: 40 },
    submitBtnDisabled: { backgroundColor: '#CBD5E1' },
    submitBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '500' },
});

export default AddDroneScreen;
