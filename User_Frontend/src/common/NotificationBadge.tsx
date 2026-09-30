import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  max?: number;
}

/** Red count badge pinned to the top-right of the notification icon. Renders nothing when count is 0. */
const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, max = 99 }) => {
  if (!count || count <= 0) return null;
  const label = count > max ? `${max}+` : `${count}`;
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.badgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
  },
});

export default NotificationBadge;
