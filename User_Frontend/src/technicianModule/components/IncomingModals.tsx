import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import IncomingTicketCard from './IncomingTicketCard';
import ArrowBackwardIcon from '../../assets/ArrowBackWardIcon.svg';
import { useLanguage } from '../../i18n';

interface TicketData {
  id: string;
  fleetManagerName?: string;
  fleetManagerPhone?: string;
  droneName?: string;
  droneId?: string;
  problem?: string;
  description?: string;
  location?: string;
  estimatedEarnings?: number;
}

interface ViewAllModalProps {
  visible: boolean;
  onClose: () => void;
  tickets?: TicketData[];
  onTicketPress?: (ticket: TicketData) => void;
}

interface DetailsModalProps {
  visible: boolean;
  onClose: () => void;
  ticket?: TicketData | null;
  onAccept?: (ticket: TicketData) => void;
  onReject?: (ticket: TicketData) => void;
}

export const IncomingViewAllModal = ({ visible, onClose, tickets = [] }: ViewAllModalProps) => {
    const { t, locale } = useLanguage();
    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <ArrowBackwardIcon width={24} height={24} />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Incoming Tickets')}</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {tickets.length === 0 ? (
                        <Text style={styles.emptyText}>{t('No incoming tickets.')}</Text>
                    ) : (
                        tickets.map((ticket, idx) => (
                            <IncomingTicketCard key={ticket.id || idx} layout="list" />
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

export const IncomingDetailsModal = ({ visible, onClose, ticket, onAccept, onReject }: DetailsModalProps) => {
    const { t, locale } = useLanguage();
    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <ArrowBackwardIcon width={24} height={24} />
                    </TouchableOpacity>
                    <Text style={styles.pageTitle}>{t('Ticket Details')}</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.sectionPadding}>
                        <Text style={styles.sectionTitle}>{t('Fleet Manager Details')}</Text>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Name')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.fleetManagerName || 'Not available')}</Text>
                        </View>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Phone')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.fleetManagerPhone || 'Not available')}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.sectionPadding}>
                        <Text style={styles.sectionTitle}>{t('Drone Details')}</Text>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Name')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.droneName || 'Not available')}</Text>
                        </View>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Drone ID')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.droneId || 'Not available')}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.sectionPadding}>
                        <Text style={styles.sectionTitle}>{t('Ticket Details')}</Text>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Main Problem')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.problem || 'Not available')}</Text>
                        </View>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Problem Description')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.description || 'Not available')}</Text>
                        </View>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Ticket ID')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.id || 'Not available')}</Text>
                        </View>
                        <View style={styles.dataBlockTight}>
                            <Text style={styles.dataLabel}>{t('Location')}</Text>
                            <Text style={styles.dataValue}>{t(ticket?.location || 'Not available')}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.sectionPadding}>
                        <Text style={styles.sectionTitle}>{t('Estimated Earnings Breakdown')}</Text>
                        <View style={styles.financialRow}>
                            <Text style={styles.dataLabel}>{t('Est. Service Cost')}</Text>
                            <Text style={styles.dataValueBold}>
                                ₹ {(ticket?.estimatedEarnings ?? 0).toLocaleString(locale)}
                            </Text>
                        </View>
                        <View style={styles.dashedDivider} />
                        <View style={styles.financialRow}>
                            <Text style={styles.totalTextLabel}>{t('Total')}</Text>
                            <Text style={styles.totalTextValue}>
                                ₹ {(ticket?.estimatedEarnings ?? 0).toLocaleString(locale)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={styles.acceptBtnSolid}
                            activeOpacity={0.85}
                            onPress={() => { ticket && onAccept?.(ticket); onClose(); }}
                        >
                            <Text style={styles.acceptBtnText}>{t('Accept')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.rejectBtnOutlined}
                            activeOpacity={0.85}
                            onPress={() => { ticket && onReject?.(ticket); onClose(); }}
                        >
                            <Text style={styles.rejectBtnText}>{t('Reject')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop:60, paddingBottom: 16 },
    backBtn: { marginRight: 16 },
    backArrow: { fontSize: 28, color: '#475569', marginTop: -4 },
    pageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },
    emptyText: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 40 },
    sectionPadding: { paddingTop: 16 },
    sectionTitle: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B', marginBottom: 16 },
    dataBlockTight: { marginBottom: 16 },
    dataLabel: { fontSize: 15, fontFamily: 'Roboto-Regular', color: '#64748B', marginBottom: 4 },
    dataValue: { fontSize: 17, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B', lineHeight: 24 },
    dataValueBold: { fontSize: 17, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
    dashedDivider: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginVertical: 16 },
    financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalTextLabel: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A' },
    totalTextValue: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A' },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 24, paddingBottom: 24 },
    acceptBtnSolid: { flex: 1, backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    acceptBtnText: { color: '#FFFFFF', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
    rejectBtnOutlined: { flex: 1, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#C53030', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
    rejectBtnText: { color: '#C53030', fontFamily: 'Roboto-Medium', fontSize: 16, fontWeight: '500' },
});
