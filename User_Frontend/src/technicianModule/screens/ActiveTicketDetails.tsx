import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    SafeAreaView
} from 'react-native';

import PhoneIcon from '../../assets/phone.svg';
import RupeeIcon from '../../assets/rupeeIcon.svg';
import SupportCard from '../../customerModule/components/SupportCard';
import ArrowBackwardIcon from '../../assets/ArrowBackWardIcon.svg';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

interface ActiveTicketDetailsProps {
    onNavigate: (screen: string) => void;
}

const DashedDivider = () => (
    <View style={styles.dashedDividerWrapper}>
        <View style={styles.dashedDivider} />
    </View>
);

const ActiveTicketDetails: React.FC<ActiveTicketDetailsProps> = ({ onNavigate }) => {
    // 1: Initial | 2: In-Progress | 3: Media Uploaded | 4: Approval Pending | 5: Approval Received | 6: Payment Completed
    const [repairState, setRepairState] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
    const [mediaUploaded, setMediaUploaded] = useState(false);
    const { t, locale } = useLanguage();
    const tabBarPadding = useTabBarPadding();

    const handleBack = () => {
        if (repairState === 1) {
            onNavigate('Home');
        } else {
            setRepairState((prev) => (prev - 1) as any);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* 1. TITLE & BACK BUTTON */}
            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={handleBack}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ArrowBackwardIcon width={24} height={24} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('Ticket Details')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarPadding }]}>

                {/* 2. MAP (State 1 Only) */}
                {repairState === 1 && (
                    <View style={styles.sectionPadding}>
                        <View style={styles.mapContainer}>
                            <Image
                                source={require('../../assets/maps1.png')}
                                style={styles.mapImage}
                                resizeMode="cover"
                            />
                            <View style={styles.liveTrackingPill}>
                                <Text style={styles.liveTrackingText}>{t('Live Tracking')}</Text>
                            </View>
                        </View>
                        <Text style={styles.mapBelowText}>
                            {t('You will reach in {{time}}', { time: '25 min' })}
                        </Text>
                        <DashedDivider />
                    </View>
                )}

                {/* 3. FLEET MANAGER DETAILS */}
                <View style={styles.sectionPadding}>
                    <View style={styles.rowSpaceBetween}>
                        <Text style={styles.sectionTitle}>{t('Fleet Manager Details')}</Text>
                        <TouchableOpacity style={styles.phonePillBtn} activeOpacity={0.8}>
                            <PhoneIcon width={20} height={20} fill="#1E293B" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Name')}</Text>
                        <Text style={styles.dataValue}>John Smith</Text>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Phone')}</Text>
                        <Text style={styles.dataValue}>+44 7700 900123</Text>
                    </View>
                </View>
                <DashedDivider />

                {/* 4. DRONE DETAILS */}
                <View style={styles.sectionPadding}>
                    <Text style={styles.sectionTitle}>{t('Drone Details')}</Text>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Name')}</Text>
                        <Text style={styles.dataValue}>DJI Mavrick 1050</Text>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Drone ID')}</Text>
                        <Text style={styles.dataValue}>DRN-MH05-123456</Text>
                    </View>
                </View>
                <DashedDivider />

                {/* 5. TICKET DETAILS */}
                <View style={styles.sectionPadding}>
                    <Text style={styles.sectionTitle}>{t('Ticket Details')}</Text>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Main Problem')}</Text>
                        <Text style={styles.dataValue}>Drone Crashed</Text>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Problem Description')}</Text>
                        <Text style={styles.dataValue}>Lost control while flying and the drone crashed against a tree.</Text>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Ticket ID')}</Text>
                        <Text style={styles.dataValue}>T-123456</Text>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Location')}</Text>
                        <Text style={styles.dataValue}>Kotamgaon, Nashik, Maharashtra, 456215</Text>
                    </View>
                    <View style={styles.dataBlockTight}>
                        <Text style={styles.dataLabel}>{t('Media by Fleet Manager')}</Text>
                        <View style={styles.mediaRow}>
                            <View style={styles.mediaThumbnailBox}>
                                <Image source={require('../../assets/MediaIcon.jpg')} style={styles.mediaThumbnailImage} />
                            </View>
                            <View style={styles.mediaThumbnailBox}>
                                <Image source={require('../../assets/MediaIcon.jpg')} style={styles.mediaThumbnailImage} />
                            </View>
                        </View>
                    </View>
                </View>
                <DashedDivider />

                {/* 6. TECHNICIAN MEDIA (States 3, 4, 5, 6) */}
                {repairState >= 3 && (
                    <View style={styles.sectionPadding}>
                        <Text style={styles.sectionTitle}>{t('Media by Technician')}</Text>
                        <View style={styles.mediaRow}>
                            <View style={styles.mediaThumbnailBox}>
                                <Image source={require('../../assets/MediaIcon.jpg')} style={styles.mediaThumbnailImage} />
                            </View>
                            <View style={styles.mediaThumbnailBox}>
                                <Image source={require('../../assets/MediaIcon.jpg')} style={styles.mediaThumbnailImage} />
                            </View>
                        </View>
                        <DashedDivider />
                    </View>
                )}

                {/* ─── STATE 4: ADDITIONAL CHARGES (Approval Pending) ─── */}
                {repairState === 4 && (
                    <>
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setRepairState(5)}>
                            <View style={styles.sectionPadding}>
                                <Text style={styles.sectionTitleDark}>{t('Additional Charges Details')}</Text>

                                <View style={styles.dataBlockTight}>
                                    <Text style={styles.dataLabel}>{t('Additional Charges reason')}</Text>
                                    <Text style={styles.dataValueBold}>Part Replacement</Text>
                                </View>

                                <Text style={[styles.dataValueBold, { marginBottom: 8 }]}>{t('Cost of Each Part:')}</Text>

                                <View style={styles.financialRow}>
                                    <Text style={styles.dataLabel}>Propellar</Text>
                                    <Text style={styles.dataValueBold}>₹ 250</Text>
                                </View>
                                <View style={styles.financialRow}>
                                    <Text style={styles.dataLabel}>Propellar</Text>
                                    <Text style={styles.dataValueBold}>₹ 250</Text>
                                </View>

                                <View style={[styles.financialRow, { marginTop: 6, marginBottom: 16 }]}>
                                    <Text style={styles.totalTextLabel}>{t('Total')}</Text>
                                    <Text style={styles.totalTextValue}>₹ 500</Text>
                                </View>

                                <Text style={styles.dataLabel}>{t('Additional Charge Status:')}</Text>
                                <Text style={styles.statusPendingRed}>{t('Service Centre Approval Pending')}</Text>
                            </View>
                        </TouchableOpacity>
                        <DashedDivider />
                    </>
                )}

                {/* ─── STATE 5: ADDITIONAL CHARGES (Approval Received) ─── */}
                {repairState === 5 && (
                    <>
                        <View style={styles.sectionPadding}>
                            <Text style={styles.sectionTitleDark}>{t('Additional Charge Details')}</Text>

                            <View style={styles.dataBlockTight}>
                                <Text style={styles.dataLabel}>{t('Additional Charge Reason')}</Text>
                                <Text style={styles.dataValueBold}>Additional Charges Reason</Text>
                            </View>

                            <View style={styles.dataBlockTight}>
                                <Text style={styles.dataLabel}>{t('Amount')}</Text>
                                <Text style={styles.dataValueBold}>₹500</Text>
                            </View>

                            <Text style={styles.dataLabel}>{t('Additional Charge Status:')}</Text>
                            <Text style={styles.statusApprovedGreen}>{t('Service Centre Approval Received')}</Text>
                        </View>
                        <DashedDivider />
                    </>
                )}

                {/* 7. ESTIMATED EARNINGS BREAKDOWN */}
                <View style={styles.sectionPadding}>
                    <Text style={styles.sectionTitle}>{t('Estimated Earnings Breakdown')}</Text>
                    <View style={styles.financialRow}>
                        <Text style={styles.dataLabel}>{t('Est. Service Cost')}</Text>
                        <Text style={styles.dataValueBold}>₹ 2,000</Text>
                    </View>

                    <View style={{ marginVertical: 16 }}>
                        <View style={styles.dashedDivider} />
                    </View>

                    <View style={styles.financialRow}>
                        <Text style={styles.totalTextLabel}>{t('Total')}</Text>
                        <Text style={styles.totalTextValue}>₹ 2,000</Text>
                    </View>

                    <Text style={[styles.dataLabel, { marginTop: 16, marginBottom: 4 }]}>{t('Customer Payment Status:')}</Text>
                    <Text style={repairState === 6 ? styles.statusApprovedGreen : styles.paymentPendingText}>
                        {repairState === 6 ? t('Payment Completed') : t('Payment Pending')}
                    </Text>
                </View>
                <DashedDivider />

                {/* ─── STATE 6: EARNINGS STATUS ─── */}
                {repairState === 6 && (
                    <>
                        <View style={styles.sectionPadding}>
                            <Text style={styles.giantStatusHeading}>{t('Earnings Status:')}</Text>
                            <Text style={styles.giantStatusGreen}>{t('Payment Completed')}</Text>
                        </View>
                        <DashedDivider />
                    </>
                )}

                {/* 8. ACTION BUTTONS FOOTER */}
                <View style={styles.sectionPadding}>
                    {repairState === 1 && (
                        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setRepairState(2)}>
                            <Text style={styles.primaryBtnText}>{t('Start Repair')}</Text>
                        </TouchableOpacity>
                    )}

                    {repairState === 2 && (
                        <>
                            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setMediaUploaded(true)}>
                                <Text style={styles.primaryBtnText}>{t('Upload Media')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.disabledBtn, mediaUploaded && styles.primaryBtn]}
                                activeOpacity={mediaUploaded ? 0.85 : 1}
                                onPress={() => mediaUploaded && setRepairState(3)}
                                disabled={!mediaUploaded}
                            >
                                <Text style={styles.primaryBtnText}>{t('Finish Repair')}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {repairState === 3 && (
                        <>
                            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
                                <View style={styles.iconBtnInner}>
                                    <RupeeIcon width={18} height={18} fill="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.primaryBtnText}>{t('Add Additional charges')}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setRepairState(4)}>
                                <Text style={styles.primaryBtnText}>{t('Finish Repair')}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* State 4 has no buttons down here */}

                    {repairState === 5 && (
                        <>
                            <TouchableOpacity style={styles.stackedPrimaryBtn} activeOpacity={0.85} onPress={() => setRepairState(6)}>
                                <Text style={styles.primaryBtnText}>{t('Payment by Cash')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.stackedPrimaryBtn} activeOpacity={0.85} onPress={() => setRepairState(6)}>
                                <Text style={styles.primaryBtnText}>{t('Payment by UPI')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.complaintBtnOutlined} activeOpacity={0.8}>
                                <Text style={styles.complaintBtnText}>{t('Raise a Complaint')}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {repairState === 6 && (
                        <TouchableOpacity style={styles.complaintBtnOutlined} activeOpacity={0.8}>
                            <Text style={styles.complaintBtnText}>{t('Raise a Complaint')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 9. SUPPORT CARD (States 1 to 4 Only) */}
                {repairState <= 4 && (
                    <View style={[styles.sectionPadding, { paddingBottom: 20 }]}>
                        <SupportCard onNavigate={onNavigate} />
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingBottom: 64 },

    // Header
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#F8FAFC' },
    backBtn: { marginRight: 16, justifyContent: 'center' },
    backArrow: { fontSize: 28, color: '#475569', fontWeight: '400', marginTop: -4 },
    pageTitle: { fontSize: 22, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },

    sectionPadding: { paddingHorizontal: 20 },

    // Map
    mapContainer: { position: 'relative', width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginTop: 10 },
    mapImage: { width: '100%', height: '100%' },
    liveTrackingPill: { position: 'absolute', top: 12, left: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    liveTrackingText: { fontSize: 13, fontFamily: 'Roboto-Medium', fontWeight: '500', color: '#1E293B' },
    mapBelowText: { fontSize: 16, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#475569', marginTop: 16 },
    mapBelowTextDark: { color: '#1E293B', fontFamily: 'Roboto-Medium', fontWeight: '700' },

    // Dividers
    dashedDividerWrapper: { marginVertical: 20 },
    dashedDivider: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 1 },

    // Data Blocks
    rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B', marginBottom: 16 },
    sectionTitleDark: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A', marginBottom: 14 },
    dataBlockTight: { marginBottom: 16 },
    dataLabel: { fontSize: 15, fontFamily: 'Roboto-Regular', fontWeight: '400', color: '#64748B', marginBottom: 4 },
    dataValue: { fontSize: 17, fontFamily: 'Roboto-Medium', fontWeight: '600', color: '#1E293B', lineHeight: 24 },
    dataValueBold: { fontSize: 17, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A' },

    phonePillBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center' },

    // Media
    mediaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
    mediaThumbnailBox: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F4F6F8' },
    mediaThumbnailImage: { width: '100%', height: '100%' },

    // Financials & Statuses
    financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    totalTextLabel: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A' },
    totalTextValue: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#0F172A' },
    paymentPendingText: { fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#B91C1C' },

    statusPendingRed: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#B91C1C' },
    statusApprovedGreen: { fontSize: 16, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#188A4E' },

    giantStatusHeading: { fontSize: 20, fontFamily: 'Roboto-Regular', color: '#334155', marginBottom: 6 },
    giantStatusGreen: { fontSize: 20, fontFamily: 'Roboto-Medium', fontWeight: '700', color: '#188A4E' },

    // Buttons
    primaryBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    stackedPrimaryBtn: { backgroundColor: '#0B3A2C', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },

    disabledBtn: { backgroundColor: '#CBD5E1', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },

    complaintBtnOutlined: { borderWidth: 1.5, borderColor: '#64748B', borderRadius: 100, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
    complaintBtnText: { color: '#475569', fontSize: 18, fontFamily: 'Roboto-Medium', fontWeight: '500' },

    iconBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

export default ActiveTicketDetails;