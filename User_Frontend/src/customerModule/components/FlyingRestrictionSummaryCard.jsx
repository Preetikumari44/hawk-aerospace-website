import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import GreenCheckMarkIcon from '../assets/Icons_V02/Icons/GreenCheckMarkIcon.svg';
import SafetyIcon from '../assets/Icons_V02/Icons/SafetyIcon.svg';
import CautionIcon from '../../assets/CautionIcon.svg';
import NoFlyIcon from '../../assets/NoFlyIcon.svg';
import { useLanguage } from '../../i18n';


// Custom compact row 
const CompactRow = ({ title, value, dotColor = '#10B981' }) => (
  <View style={styles.rowContainer}>
    <View style={styles.rowLeft}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.rowTitle}>{title}</Text>
    </View>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const FlyingRestrictionSummaryCard = ({ restrictions = {} }) => {
  const { t, locale } = useLanguage();
  const status = String(restrictions?.status || 'green').toLowerCase();
  const isGreen = status === 'green';
  const isYellow = status === 'yellow';
  const isRed = status === 'red';
  const badgeBg = isGreen ? '#D1FAE5' : isYellow ? '#FEF3C7' : '#FEE2E2';
  const badgeTextColor = isGreen ? '#065F46' : isYellow ? '#92400E' : '#991B1B';
  const badgeBorderColor = isGreen ? '#10B981' : isYellow ? '#F59E0B' : '#EF4444';
  const dotColor = isGreen ? '#10B981' : isYellow ? '#F59E0B' : '#EF4444';
  const badgeLabel = isGreen ? t('Safe to Fly') : isYellow ? t('Caution') : t('Restricted');
  const nearestZone = restrictions?.nearestZone;
  const allZones = restrictions?.zones || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <SafetyIcon width={18} height={18} style={styles.shield} />
          <Text style={styles.heading}>{t('Flying Restrictions Check')}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorderColor }]}>
          <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Restriction Details */}
      <View style={styles.detailsContainer}>
        <CompactRow dotColor={dotColor} title={t('Status')} value={restrictions?.status ? t(restrictions.status) : t('N/A')} />
        {/*<CompactRow dotColor={dotColor} title={t('Summary')} value={restrictions?.summary || (isRed ? t('This is a no-fly zone. Specific permissions are required for this booking.') : isYellow ? t('Partial restriction — proceed with caution.') : t('No restrictions data'))} />*/}
        {/*{restrictions?.checkedAt ? <CompactRow dotColor={dotColor} title={t('Last Checked')} value={new Date(restrictions.checkedAt).toLocaleString(locale)} /> : null}*/}
        {nearestZone ? (
          <>
            <CompactRow dotColor={dotColor} title={t('Nearest Zone')} value={nearestZone.name || t('N/A')} />
            <CompactRow dotColor={dotColor} title={t('Distance')} value={nearestZone.distanceKm ? t('{{distance}} km', { distance: nearestZone.distanceKm }) : t('N/A')} />
            <CompactRow dotColor={dotColor} title={t('Zone Type')} value={nearestZone.type ? t(nearestZone.type) : t('N/A')} />
          </>
        ) : null}
        {/*{allZones.length > 0 ? allZones.slice(0, 3).map((zone, idx) => (
          <CompactRow key={idx} dotColor={dotColor} title={t('Zone {{num}}', { num: idx + 1 })} value={t('{{name}} ({{distance}} km)', { name: zone.name || t('Unknown'), distance: zone.distanceKm || '?' })} />
        )) : null}*/}
        {restrictions?.reasons && restrictions.reasons.length > 0 ? restrictions.reasons.map((reason, idx) => (
          <CompactRow key={idx} dotColor={dotColor} title={t('Reason {{num}}', { num: idx + 1 })} value={reason} />
        )) : null}
      </View>

      {/* Status Card */}
      <View style={[styles.successCard, { backgroundColor: isGreen ? '#ECFDF5' : isYellow ? '#FFFBEB' : '#FEF2F2', borderColor: isGreen ? '#10B981' : isYellow ? '#F59E0B' : '#EF4444' }]}>
        <View style={styles.successIcon}>
          {isGreen ? (
            <GreenCheckMarkIcon width={40} height={40} />
          ) : isYellow ? (
            <CautionIcon width={40} height={40} />
          ) : (
            <NoFlyIcon width={40} height={40} />
          )}
        </View>
        <View style={styles.successTextContainer}>
          <Text style={[styles.successTitle, { color: isGreen ? '#065F46' : isYellow ? '#92400E' : '#991B1B' }]}>
            {isGreen ? t('Safe to Fly') : isYellow ? t('Caution Advised') : t('Restricted Area')}
          </Text>
          <Text style={[styles.successSubtitle, { color: isGreen ? '#065F46' : isYellow ? '#92400E' : '#991B1B' }]}>
            {restrictions?.summary || (isGreen ? t('Flying Drone is Allowed in this Area') : isYellow ? t('Additional permissions may be required') : t('This is a no-fly zone. Specific permissions are required for this booking.'))}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingVertical: 16, // REDUCED for compact size
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginVertical: 12, // REDUCED for compact size
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shield: {
    marginRight: 6,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  badge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12, // REDUCED for compact size
  },
  
  detailsContainer: {
    paddingHorizontal: 4, 
    marginBottom: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6, // MASSIVELY REDUCED from 16 to 6 to crunch the text together nicely
    gap: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
    maxWidth: '45%',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 10,
    marginTop: 5,
  },
  rowTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
  },

  successCard: {
    marginTop: 6, // REDUCED
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    padding: 12, // REDUCED
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    // width: 32,
    // height: 32,
    // borderRadius: 16,
    // backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  successSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default FlyingRestrictionSummaryCard;
