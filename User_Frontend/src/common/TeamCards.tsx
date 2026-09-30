import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { useLanguage } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEEK_WIDTH = SCREEN_WIDTH * 0.82;

/**
 * Shared FM ↔ Pilot team cards (carousel card + detail modal).
 * Customer-style typography: system font + weights, #2F3542 headings.
 */
export const TeamMemberCard = ({
  title,
  subtitle,
  tags = [],
  actionLabel,
  onAction,
  onPress,
}: {
  title: string;
  subtitle?: string;
  tags?: string[];
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
}) => {
  const { t } = useLanguage();
  return (
    <Pressable onPress={onPress} style={[styles.card, { width: PEEK_WIDTH }]}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(title || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>{t(tag)}</Text>
            </View>
          ))}
        </View>
      )}
      {!!actionLabel && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

export const TeamDetailModal = ({
  visible,
  title,
  rows = [],
  onClose,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  visible: boolean;
  title: string;
  rows?: Array<{ label: string; value: string }>;
  onClose: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) => {
  const { t } = useLanguage();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{t(row.label)}</Text>
              <Text style={styles.rowValue}>{row.value || t('Not provided')}</Text>
            </View>
          ))}
          {!!primaryLabel && (
            <TouchableOpacity style={styles.primaryBtn} onPress={onPrimary} activeOpacity={0.85}>
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}
          {!!secondaryLabel && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary} activeOpacity={0.85}>
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>{t('Close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginRight: 16,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '600', color: '#374151' },
  name: { fontSize: 16, fontWeight: '600', color: '#2F3542' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  tag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { fontSize: 12, color: '#4B5563' },
  actionBtn: {
    backgroundColor: '#5060D3',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2F3542', marginBottom: 16 },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  rowValue: { fontSize: 15, color: '#1F2937' },
  primaryBtn: {
    backgroundColor: '#5060D3',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
  closeBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  closeText: { color: '#6B7280', fontSize: 14 },
});

export default TeamMemberCard;
