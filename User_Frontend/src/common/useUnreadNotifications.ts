import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { connectSocket } from '../utils/socket';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeList = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
};

/** Count unread notification messages (last 30 days). Mirrors NotificationHistory parsing. */
export const fetchUnreadNotificationCount = async (): Promise<number> => {
  try {
    const res = await apiRequest('/notifications');
    const docs = normalizeList(res);
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    let unread = 0;
    docs.forEach((doc: any) => {
      const messages = Array.isArray(doc.messages) && doc.messages.length > 0
        ? doc.messages
        : [{ message: '', timestamp: doc.createdAt, read: false }];
      messages.forEach((msg: any) => {
        const timestamp = msg?.timestamp || doc.createdAt || '';
        const time = new Date(timestamp).getTime();
        if (!timestamp || Number.isNaN(time) || time < cutoff) return;
        if (!msg.read) unread += 1;
      });
    });
    return unread;
  } catch (e) {
    return 0;
  }
};

/**
 * Hook returning the number of unread notifications.
 * Refreshes on mount, on socket `notification:new`, and on demand via `refresh`.
 * Returns 0 when everything is read (callers hide the badge when 0).
 */
export const useUnreadNotifications = (enabled: boolean = true) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const count = await fetchUnreadNotificationCount();
    setUnreadCount(count);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let sock: any = null;
    refresh();
    connectSocket().then((s) => {
      if (cancelled || !s) return;
      sock = s;
      sock.on('notification:new', refresh);
    });
    return () => {
      cancelled = true;
      if (sock) sock.off('notification:new', refresh);
    };
  }, [enabled, refresh]);

  return { unreadCount, refresh, setUnreadCount };
};

export default useUnreadNotifications;
