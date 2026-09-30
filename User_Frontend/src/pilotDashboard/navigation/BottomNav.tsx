import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/theme';
import { NAV_ITEMS, ScreenKey } from './navConfig';

interface BottomNavProps {
  active: ScreenKey;
  onNavigate: (key: ScreenKey) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ active, onNavigate }) => {
  return (
    <View style={styles.bar}>
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key || (active === 'MissionDetails' && item.key === 'Missions') || (active === 'Payout' && item.key === 'Earnings');
        const Icon = isActive ? item.Active : item.Inactive;
        return (
          <TouchableOpacity key={item.key} style={styles.item} activeOpacity={0.75} onPress={() => onNavigate(item.key)}>
            <Icon width={19} height={19} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.cardWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: Platform.select({ web: spacing.sm, default: spacing.lg }),
    paddingHorizontal: spacing.xs,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  label: { ...typography.caption, color: colors.textMuted, letterSpacing: 0 },
  labelActive: { color: colors.forestGreen },
});

export default BottomNav;
