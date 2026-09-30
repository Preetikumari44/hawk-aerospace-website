import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

// Popover opened from the header bell icon. When `inline` is true, the
// caller (Header) is already positioning this inside an absolutely
// positioned anchor View, so this renders without its own absolute
// positioning to avoid double-offsetting.
export default function NotificationPanel({ notifications, inline }) {
  const items = notifications || [];
  return (
    <View style={[styles.popup, inline && styles.popupInline]}>
      <Text style={styles.title}>Notifications</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No new notifications.</Text>
      ) : (
        items.map((n) => (
          <View key={n.id} style={styles.item}>
            <Text style={styles.itemTitle}>{n.title}</Text>
            <Text style={styles.itemBody}>{n.body}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    top: 40,
    right: 96,
    width: 240,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 30,
  },
  popupInline: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  empty: { ...typography.caption, color: colors.textSecondary },
  item: { paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs },
  itemTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  itemBody: { ...typography.caption, color: colors.textSecondary },
});
