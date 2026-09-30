// src/components/Header.js
// Solutions / Technology / Platforms / Marketplace stay in the header.
// Marketplace navigates to the Marketplace screen; the others are
// top-level links kept for visual/navigational parity with the rest of
// the Hawk Aerospace ecosystem. The 9-dots grid opens a workspace
// switcher (Customer / Pilot / Fleet Manager / Technician, each with a
// real icon). The avatar/name is compact until clicked, then expands
// into the full profile menu (Profile, Account Settings, Back to Home,
// Logout). Only one dropdown is open at a time.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, FONT, RADIUS } from '../theme/theme';
import { useCart } from '../utils/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { workspaces } from '../data/workspacesData';
import { notifications } from '../data/notificationsData';
import {
  IconGrid, IconBell, IconChevronDown, IconChevronUp,
  IconUser, IconSettings, IconArrowRight, IconLogout,
} from './icons';

const CENTER_NAV = ['Solutions', 'Technology', 'Platforms', 'Marketplace'];

export default function Header({ userName = 'Arjun Mehta', role = 'Sales Aggregator', onSwitchRole }) {
  const { navigate } = useNavigation();
  const { count } = useCart();
  const [openMenu, setOpenMenu] = useState(null); // 'notifications' | 'grid' | 'profile' | null

  const toggle = (menu) => setOpenMenu((m) => (m === menu ? null : menu));
  const closeMenu = () => setOpenMenu(null);

  const handleCenterNav = (link) => {
    closeMenu();
    if (link === 'Marketplace') navigate('Marketplace');
  };

  const handleWorkspaceSelect = (ws) => {
    closeMenu();
    if (onSwitchRole && ws?.key) {
      onSwitchRole(ws.key);
      return;
    }
    if (Platform.OS === 'web') {
      window.alert(`${ws.label} workspace`);
    }
  };

  const handleBackToHome = () => {
    closeMenu();
    navigate('SalesAggregatorDashboard');
  };

  const handleProfileNav = (section) => {
    closeMenu();
    navigate('Account', { section });
  };

  const handleLogout = () => {
    closeMenu();
    // eslint-disable-next-line no-alert
    window.alert('You have been logged out of Hawk Aerospace.');
  };

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>H</Text></View>
        <Text style={styles.brand}>Hawk Aerospace</Text>
      </View>

      <View style={styles.center}>
        {CENTER_NAV.map((link) => (
          <TouchableOpacity key={link} style={styles.navItem} onPress={() => handleCenterNav(link)}>
            <Text style={styles.navText}>{link}</Text>
            {link === 'Marketplace' && count > 0 && (
              <View style={styles.cartDot}><Text style={styles.cartDotText}>{count}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.right}>
        {/* Notification bell */}
        <View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => toggle('notifications')}>
            <IconBell size={18} color="#374151" />
            {notifications.length > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
          {openMenu === 'notifications' && (
            <View style={[styles.dropdown, styles.notificationDropdown]}>
              <Text style={styles.dropdownHeading}>Notifications</Text>
              {notifications.map((n) => (
                <View key={n.id} style={styles.notificationRow}>
                  <Text style={styles.notificationTitle}>{n.title}</Text>
                  <Text style={styles.notificationMessage}>{n.message}</Text>
                  <Text style={styles.notificationTime}>{n.time}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 9-dot workspace switcher */}
        <View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => toggle('grid')}>
            <IconGrid size={18} color="#374151" />
          </TouchableOpacity>
          {openMenu === 'grid' && (
            <View style={[styles.dropdown, styles.workspaceDropdown]}>
              <Text style={styles.dropdownHeading}>Hawk Aerospace Workspaces</Text>
              <View style={styles.workspaceGrid}>
                {workspaces.map((ws) => {
                  const Icon = ws.Icon;
                  return (
                    <TouchableOpacity key={ws.key} style={styles.workspaceItem} onPress={() => handleWorkspaceSelect(ws)}>
                      <View style={styles.workspaceIconWrap}>
                        <Icon size={20} color={COLORS.primaryDark} />
                      </View>
                      <Text style={styles.workspaceLabel}>{ws.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Compact profile -> full profile menu */}
        <View>
          <TouchableOpacity style={styles.profile} onPress={() => toggle('profile')}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{userName.charAt(0)}</Text></View>
            <View>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userRole}>{role}</Text>
            </View>
            {openMenu === 'profile' ? <IconChevronUp /> : <IconChevronDown />}
          </TouchableOpacity>

          {openMenu === 'profile' && (
            <View style={[styles.dropdown, styles.profileDropdown]}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{userName.charAt(0)}</Text></View>
                <View>
                  <Text style={styles.profileName}>{userName}</Text>
                  <Text style={styles.profileRole}>{role}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleProfileNav('profile')}>
                <IconUser size={15} color={COLORS.textPrimary} />
                <Text style={styles.dropdownText}>Profile / Account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleProfileNav('settings')}>
                <IconSettings size={15} color={COLORS.textPrimary} />
                <Text style={styles.dropdownText}>Account Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleBackToHome}>
                <IconArrowRight size={15} color={COLORS.textPrimary} />
                <Text style={styles.dropdownText}>Back to Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                <IconLogout size={15} color={COLORS.danger} />
                <Text style={[styles.dropdownText, { color: COLORS.danger }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, zIndex: 30,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  logoMark: { width: 28, height: 28, borderRadius: 6, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  logoMarkText: { color: COLORS.textInverse, fontWeight: '700', fontSize: 13 },
  brand: { ...FONT.h2, color: COLORS.textPrimary },
  center: { flexDirection: 'row', gap: SPACING.lg },
  navItem: { paddingHorizontal: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  navText: { ...FONT.body, color: COLORS.textSecondary },
  cartDot: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  cartDotText: { color: COLORS.textInverse, fontSize: 9, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconBtn: { padding: SPACING.xs },
  badge: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },

  profile: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  userName: { ...FONT.h3, color: COLORS.textPrimary },
  userRole: { ...FONT.small, color: COLORS.textSecondary },

  dropdown: {
    position: 'absolute', top: 40, right: 0, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    zIndex: 40,
  },
  dropdownHeading: { ...FONT.h3, color: COLORS.textPrimary, paddingHorizontal: SPACING.md, marginBottom: SPACING.xs },

  notificationDropdown: { width: 260 },
  notificationRow: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  notificationTitle: { ...FONT.h3, color: COLORS.textPrimary },
  notificationMessage: { ...FONT.small, color: COLORS.textSecondary, marginTop: 1 },
  notificationTime: { ...FONT.small, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },

  workspaceDropdown: { width: 260, paddingHorizontal: SPACING.md },
  workspaceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  workspaceItem: { width: '46%', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  workspaceIconWrap: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  workspaceLabel: { ...FONT.small, color: COLORS.textPrimary, fontWeight: '600', textAlign: 'center' },

  profileDropdown: { width: 220 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: SPACING.xs },
  avatarLarge: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  profileName: { ...FONT.h3, color: COLORS.textPrimary },
  profileRole: { ...FONT.small, color: COLORS.textSecondary },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  dropdownText: { ...FONT.body, color: COLORS.textPrimary },
});
