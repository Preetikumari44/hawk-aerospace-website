import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/theme';

const CommonFooter: React.FC = () => (
  <View style={styles.bar}>
    <Text style={styles.text}>© {new Date().getFullYear()} Hawk Aerospace</Text>
    <View style={styles.links}>
      <Text style={styles.link}>Privacy</Text>
      <Text style={styles.link}>Terms</Text>
      <Text style={styles.link}>Support</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  text: { ...typography.caption, color: colors.textMuted, textTransform: 'none' },
  links: { flexDirection: 'row', gap: spacing.lg },
  link: { ...typography.caption, color: colors.textSecondary, textTransform: 'none' },
});

export default CommonFooter;
