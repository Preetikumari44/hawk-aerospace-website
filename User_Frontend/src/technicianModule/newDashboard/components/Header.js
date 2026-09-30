import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import { useApp } from '../context/AppContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import NotificationPanel from './NotificationPanel';

const NAV_ITEMS = ['Solutions', 'Technology', 'Platforms', 'Marketplace'];

// ONE reusable Hawk Aerospace header shared by every Technician screen,
// on every platform (Android, iOS, and the web build). Reads the
// technician's identity from context, so it is never tied to a
// specific hard-coded person and updates automatically once real
// auth/API data is wired into AppContext.
//
// Header popups: only ONE of Notification / Workspace can be open at a
// time (single `activePopup` state). Both are rendered inside a
// transparent Modal with a full-screen backdrop, so tapping outside,
// tapping the other icon, or navigating to another screen (via the
// `currentRoute` prop changing) all close whichever is open. Clicking
// the avatar/name never opens a floating card — it navigates straight
// to the full Profile screen via onOpenProfile.
//
// Responsive: the center Solutions/Technology/Platforms/Marketplace row
// and the profile name text are hidden below the mobile breakpoint to
// keep the bar compact; onMenuPress (a hamburger button) appears there
// instead, opening MobileDrawer for Repairs/Earnings/Home/Marketplace.
export default function Header({ activeNav, onNavPress, onOpenProfile, onMenuPress, currentRoute }) {
  const { technician, notifications } = useApp();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [activePopup, setActivePopup] = useState(null); // 'notification' | 'workspace' | null

  // Any navigation closes whichever header popup is open.
  useEffect(() => {
    setActivePopup(null);
  }, [currentRoute]);

  const closePopup = () => setActivePopup(null);
  const togglePopup = (name) => setActivePopup((prev) => (prev === name ? null : name));

  const displayName = technician.name || 'Technician';

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {isMobile ? (
          <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} activeOpacity={0.7}>
            <Text style={styles.menuGlyph}>☰</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.logoMark}>
          <Text style={styles.logoGlyph}>H</Text>
        </View>
        {!isMobile ? <Text style={styles.brand}>Hawk Aerospace</Text> : null}
      </View>

      {!isMobile ? (
        <View style={styles.center}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => onNavPress && onNavPress(item)}
              style={styles.navItemWrap}
              activeOpacity={0.7}
            >
              <Text style={[styles.navItem, activeNav === item && styles.navItemActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.center} />
      )}

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => togglePopup('notification')}
          activeOpacity={0.7}
        >
          <Text style={styles.iconGlyph}>🔔</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => togglePopup('workspace')}
          activeOpacity={0.7}
        >
          <Text style={styles.iconGlyph}>▦</Text>
        </TouchableOpacity>

        {/* Header profile area is the ONLY entry point to Account/Profile,
            and it always opens the full Profile screen — never a popup. */}
        <TouchableOpacity
          style={styles.profileWrap}
          activeOpacity={0.7}
          onPress={() => {
            closePopup();
            onOpenProfile && onOpenProfile();
          }}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{displayName.charAt(0)}</Text>
          </View>
          {!isMobile ? <Text style={styles.profileName}>{displayName}</Text> : null}
          {!isMobile ? <Text style={styles.caret}>▾</Text> : null}
        </TouchableOpacity>
      </View>

      <Modal visible={activePopup !== null} transparent animationType="fade" onRequestClose={closePopup}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closePopup}>
          {activePopup === 'notification' ? (
            <TouchableOpacity
              style={[styles.popupAnchor, isMobile ? styles.notifAnchorMobile : styles.notifAnchor]}
              activeOpacity={1}
              onPress={() => {}}
            >
              <NotificationPanel notifications={notifications} inline />
            </TouchableOpacity>
          ) : null}
          {activePopup === 'workspace' ? (
            <TouchableOpacity
              style={[styles.popupAnchor, isMobile ? styles.workspaceAnchorMobile : styles.workspaceAnchor]}
              activeOpacity={1}
              onPress={() => {}}
            >
              <WorkspaceSwitcher onClose={closePopup} inline />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    zIndex: 20,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: spacing.xs, marginRight: spacing.xs },
  menuGlyph: { fontSize: 18, color: colors.forestGreen },
  logoMark: {
    width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.forestGreen,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  logoGlyph: { color: colors.mint, fontWeight: '700' },
  brand: { ...typography.h3, color: colors.forestGreen },
  center: { flexDirection: 'row', flex: 1, justifyContent: 'center' },
  navItemWrap: { paddingHorizontal: spacing.md },
  navItem: { ...typography.body, color: colors.textSecondary },
  navItemActive: { color: colors.forestGreen, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  iconBtn: { padding: spacing.sm, marginRight: spacing.xs },
  iconGlyph: { fontSize: 15 },
  profileWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.xs },
  avatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mintSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs,
  },
  avatarInitial: { color: colors.forestGreen, fontWeight: '700', fontSize: 12 },
  profileName: { ...typography.bodyMedium, color: colors.textPrimary, marginRight: 4 },
  caret: { color: colors.textSecondary, fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  popupAnchor: { position: 'absolute', top: 56 },
  notifAnchor: { right: 96 },
  notifAnchorMobile: { right: 16, top: 56 },
  workspaceAnchor: { right: 40 },
  workspaceAnchorMobile: { right: 16, top: 56 },
});
