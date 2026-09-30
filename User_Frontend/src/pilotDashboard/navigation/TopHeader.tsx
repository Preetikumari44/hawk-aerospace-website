import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import NotificationIcon from '../assets/icons/notification-icon.svg';
import { colors } from '../theme/colors';
import { spacing, radii, typography } from '../theme/theme';
import { Pilot, HawkRole } from '../types';
import RoleLauncher from './RoleLauncher';

interface TopHeaderProps {
  pilot: Pilot | null;
  unreadCount?: number;
  onPressNotifications?: () => void;
  onPressAccount?: () => void;
  showSidebarBrand?: boolean;
}

const DotGrid: React.FC = () => (
  <View style={styles.dotGrid}>
    {Array.from({ length: 9 }).map((_, i) => (
      <View key={i} style={styles.dot} />
    ))}
  </View>
);

const TopHeader: React.FC<TopHeaderProps> = ({ pilot, unreadCount = 0, onPressNotifications, onPressAccount, showSidebarBrand }) => {
  const [launcherOpen, setLauncherOpen] = useState(false);

  return (
    <View style={styles.header}>
      <View>
        {showSidebarBrand && <Text style={styles.brandCrumb}>Hawk Aerospace</Text>}
        <Text style={styles.context}>Pilot Workspace</Text>
      </View>

      <View style={styles.rightGroup}>
        {/* Avatar is the Account entry point — no separate sidebar item, per spec. */}
        <TouchableOpacity style={styles.accountTrigger} activeOpacity={0.75} onPress={onPressAccount}>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {pilot?.name || 'Pilot'}
            </Text>
            <Text style={styles.userRole}>Drone Pilot</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(pilot?.name || 'P').charAt(0)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={onPressNotifications}>
          <NotificationIcon width={20} height={20} fill={colors.textPrimary} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setLauncherOpen(true)}>
          <DotGrid />
        </TouchableOpacity>
      </View>

      <RoleLauncher visible={launcherOpen} currentRole={'Pilot' as HawkRole} onClose={() => setLauncherOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.creamBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandCrumb: { ...typography.caption, color: colors.textMuted },
  context: { ...typography.h3, color: colors.textPrimary },
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accountTrigger: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userInfo: { alignItems: 'flex-end', maxWidth: 160, display: 'flex' },
  userName: { ...typography.smallMedium, color: colors.textPrimary },
  userRole: { ...typography.caption, color: colors.textMuted, textTransform: 'none' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...typography.bodyMedium, color: colors.mintGreen },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.cardWhite,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: { fontSize: 9, fontWeight: '700', color: colors.white },
  dotGrid: { width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textPrimary },
});

export default TopHeader;
