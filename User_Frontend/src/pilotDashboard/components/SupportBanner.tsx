import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PhoneIcon from '../assets/icons/phone.svg';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';

const SupportBanner: React.FC<{ onPress?: () => void }> = ({ onPress }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
    <View style={styles.iconCircle}>
      <PhoneIcon width={16} height={16} fill={colors.forestGreen} color={colors.forestGreen} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.title} numberOfLines={1}>24x7 Expert Support</Text>
      <Text style={styles.body} numberOfLines={2}>Get help from our agricultural drone specialists anytime</Text>
    </View>
    <Text style={styles.cta}>Support →</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.mintGreenSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.mintGreen,
    padding: spacing.sm,
    ...(shadow.card as object),
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 12, fontWeight: '700', color: colors.forestGreen },
  body: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  cta: { fontSize: 11, fontWeight: '700', color: colors.forestGreen },
});

export default SupportBanner;
