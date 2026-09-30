import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import typography from '../theme/typography';

// Four compact circular status indicators shown below the schedule
// calendar on the Repairs screen.
export default function ScheduleStatus({ legend }) {
  return (
    <View style={styles.row}>
      {legend.map((item) => (
        <View key={item.id} style={styles.item}>
          <View style={[styles.dot, item.state === 'Active' && styles.dotActive]} />
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.state}>{item.state}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  item: { alignItems: 'center', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border, marginBottom: 4 },
  dotActive: { backgroundColor: colors.mint },
  label: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  state: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
});
