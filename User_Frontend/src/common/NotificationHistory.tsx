import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { apiRequest } from '../utils/api';
import { connectSocket } from '../utils/socket';
import { useLanguage } from '../i18n';

interface NotificationMessageItem {
  message?: string;
  timestamp?: string;
  read?: boolean;
}

interface NotificationDoc {
  id?: string;
  uid?: string;
  messages?: NotificationMessageItem[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface HistoryEntry {
  key: string;
  docId: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

interface NotificationHistoryProps {
  visible: boolean;
  onClose: () => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PANEL_HEIGHT =
  Dimensions.get('window').height > 700 ? Dimensions.get('window').height * 0.7 : 420;

const normalizeList = (res: any): NotificationDoc[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
};

const splitMessage = (raw?: string): { title: string; body: string } => {
  const text = raw || '';
  const idx = text.indexOf(':');
  if (idx <= 0 || idx >= text.length - 1) {
    return { title: text, body: '' };
  }
  return { title: text.slice(0, idx).trim(), body: text.slice(idx + 1).trim() };
};

const toTimestamp = (entry: { timestamp?: string; createdAt?: string }): string => {
  return entry?.timestamp || entry?.createdAt || '';
};

const formatRelativeTime = (value: string): string => {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const diff = Date.now() - time;
  if (diff < 0) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString();
};

const NotificationHistory: React.FC<NotificationHistoryProps> = ({ visible, onClose }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const slideAnim = useRef(new Animated.Value(-MAX_PANEL_HEIGHT - 80)).current;
  const requestedReadIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await apiRequest('/notifications');
      const docs = normalizeList(res);
      const cutoff = Date.now() - THIRTY_DAYS_MS;

      const entries: HistoryEntry[] = [];
      docs.forEach((doc) => {
        const messages = Array.isArray(doc.messages) && doc.messages.length > 0 ? doc.messages : [{ message: '', timestamp: doc.createdAt, read: false }];
        messages.forEach((msg, index) => {
          const timestamp = toTimestamp(msg) || doc.createdAt || '';
          const time = new Date(timestamp).getTime();
          if (!timestamp || Number.isNaN(time) || time < cutoff) return;
          const { title, body } = splitMessage(msg.message);
          entries.push({
            key: `${doc.id || 'n'}-${index}`,
            docId: doc.id || '',
            title,
            body,
            timestamp,
            read: Boolean(msg.read),
          });
        });
      });

      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setItems(entries);

      // Mark unread notifications as read in the background (best-effort).
      const unreadDocIds = Array.from(new Set(entries.filter((e) => !e.read && e.docId).map((e) => e.docId)));
      unreadDocIds.forEach((id) => {
        if (requestedReadIdsRef.current.has(id)) return;
        requestedReadIdsRef.current.add(id);
        apiRequest(`/notifications/${id}/read`, { method: 'PATCH', body: '{}' }).catch(() => {});
      });
    } catch (error) {
      console.warn('[NotificationHistory] Failed to load notifications', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let sock: any = null;

    const refresh = () => {
      if (!cancelled) load();
    };

    connectSocket().then((s) => {
      if (cancelled || !s) return;
      sock = s;
      sock.on('notification:new', refresh);
    });

    load();

    return () => {
      cancelled = true;
      if (sock) sock.off('notification:new', refresh);
    };
  }, [visible, load]);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(-MAX_PANEL_HEIGHT - 80);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 6,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }], maxHeight: MAX_PANEL_HEIGHT }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Notifications ({{count}})', { count: items.length })}</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#5060D3" />
          </View>
        )}

        {!loading && failed && (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{t('Could not load notifications. Please try again.')}</Text>
          </View>
        )}

        {!loading && !failed && items.length === 0 && (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>{t('No notifications received in the last 30 days')}</Text>
          </View>
        )}

        {!loading && !failed && items.length > 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {items.map((item) => (
              <View key={item.key} style={styles.item}>
                {!item.read && <View style={styles.unreadDot} />}
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title || t('Notification')}
                  </Text>
                  {Boolean(item.body) && (
                    <Text style={styles.itemMessage} numberOfLines={3}>
                      {item.body}
                    </Text>
                  )}
                  <Text style={styles.itemTime}>{formatRelativeTime(item.timestamp)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0FF',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
    fontWeight: '600',
    color: '#2D2F38',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#2D2F38',
    fontWeight: '600',
  },
  stateContainer: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5060D3',
    marginTop: 6,
    marginRight: 10,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    fontWeight: '600',
    color: '#2D2F38',
  },
  itemMessage: {
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    color: '#5F606D',
    lineHeight: 19,
    marginTop: 3,
  },
  itemTime: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#9CA3AF',
    marginTop: 6,
  },
});

export default NotificationHistory;