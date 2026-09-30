import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radii, typography, shadow } from '../theme/theme';
import { Badge } from './ui';
import { AppNotification } from '../types';

interface NotificationPanelProps {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
}

const toneFor = (type: AppNotification['type']) =>
  type === 'payout' ? 'success' : type === 'mission' ? 'info' : type === 'team' ? 'neutral' : 'neutral';

const NotificationPanel: React.FC<NotificationPanelProps> = ({ visible, notifications, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
        <Text style={styles.title}>Notifications</Text>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 && <Text style={styles.empty}>You're all caught up.</Text>}
          {notifications.map((n) => (
            <View key={n.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, !n.read && styles.itemTitleUnread]}>{n.title}</Text>
                {!!n.body && <Text style={styles.itemBody}>{n.body}</Text>}
              </View>
              {!n.read && <Badge label="New" tone={toneFor(n.type) as any} />}
            </View>
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'flex-end', padding: spacing.xl },
  panel: {
    width: 360,
    maxWidth: '100%',
    backgroundColor: colors.cardWhite,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginTop: 64,
    ...(shadow.raised as object),
  },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
  empty: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: { ...typography.smallMedium, color: colors.textSecondary },
  itemTitleUnread: { color: colors.textPrimary },
  itemBody: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});

export default NotificationPanel;
