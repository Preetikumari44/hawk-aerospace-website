/** SocketContext — Socket.IO client for realtime events.
 *  Auto-connects on login, disconnects on logout.
 *  Mirrors CLIENT_EVENTS from backend gateway. */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from './AuthContext';
import { useAuth } from './AuthContext';

// Get WebSocket URL based on environment
const getWsUrl = () => {
  // Web: Use webpack DefinePlugin injected value
  // @ts-ignore
  const envWsUrl = typeof process !== 'undefined' && process.env?.REACT_APP_WS_URL
    ? process.env.REACT_APP_WS_URL
    : '';

  if (envWsUrl) {
    return envWsUrl;
  }

  // Development fallback based on platform
  if (__DEV__) {
    const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    if (isReactNative) {
      const Platform = require('react-native').Platform;
      // Android emulator needs 10.0.2.2 to reach host machine
      //return Platform.OS === 'android' ? 'http://192.168.1.7:3001' : 'http://192.168.1.7:3001';
      return Platform.OS === 'android' ? 'http://43.205.190.95:3000' : 'http://43.205.190.95:3000';
    }
  }
  return 'http://43.205.190.95:3000';
  //return 'http://192.168.1.7:3001';
};

const WS_URL = getWsUrl();

// ── Client events (mirrored from backend) ─────────────

export const CLIENT_EVENTS = {
  BOOKING_CREATED: 'booking:created',
  BOOKING_ASSIGNED: 'booking:assigned',
  BOOKING_STATUS: 'booking:status',
  BOOKING_CANCELLED: 'booking:cancelled',
  MISSION_ACCEPTED: 'mission:accepted',
  MISSION_STARTED: 'mission:started',
  MISSION_LOCATION: 'mission:location',
  MISSION_COMPLETED: 'mission:completed',
  PRICE_LOCKED: 'price:locked',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  PAYMENT_FAILED: 'payment:failed',
  DRONE_STATUS: 'drone:status',
  DRONE_ASSIGNED: 'drone:assigned',
  MAINTENANCE_OVERDUE: 'maintenance:overdue',
  INCIDENT_REPORTED: 'incident:reported',
  INCIDENT_ESCALATED: 'incident:escalated',
  INCIDENT_RESOLVED: 'incident:resolved',
  REVENUE_SNAPSHOT: 'revenue:snapshot',
  ADMIN_ACTION: 'admin:action',
  NOTIFICATION: 'notification:new',
  NOTIFICATION_BROADCAST: 'notification:broadcast',
  DELEGATED_BOOKING_STATUS: 'delegated:status',
  TICKET_CREATED: 'ticket:created',
  TICKET_STATUS: 'ticket:status',
  SLA_BREACH: 'sla:breach',
  ROLE_APPLICATION_SUBMITTED: 'role-application:submitted',
  ROLE_APPLICATION_UPDATED: 'role-application:updated',
  CHAT_CONVERSATION_CREATED: 'chat:conversation:created',
  CHAT_MESSAGE_SENT: 'chat:message:sent',
  CHAT_MESSAGE_READ: 'chat:message:read',
  CHAT_CALL_INITIATED: 'chat:call:initiated',
} as const;

type EventName = typeof CLIENT_EVENTS[keyof typeof CLIENT_EVENTS];
type EventHandler = (payload: any) => void;

// ── Context ────────────────────────────────────────────

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  /** Subscribe to a server event. Returns unsubscribe fn. */
  on: (event: EventName, handler: EventHandler) => () => void;
  /** Join a booking room for live tracking */
  joinBooking: (bookingId: string) => void;
  /** Leave a booking room */
  leaveBooking: (bookingId: string) => void;
  /** Send pilot GPS */
  sendGps: (bookingId: string, lat: number, lng: number) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  on: () => () => { },
  joinBooking: () => { },
  leaveBooking: () => { },
  sendGps: () => { },
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    const socket = io(`${WS_URL}/ws`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to', WS_URL);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  const on = useCallback((event: EventName, handler: EventHandler) => {
    const socket = socketRef.current;
    if (!socket) return () => { };
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, []);

  const joinBooking = useCallback((bookingId: string) => {
    socketRef.current?.emit('join:booking', { bookingId });
  }, []);

  const leaveBooking = useCallback((bookingId: string) => {
    socketRef.current?.emit('leave:booking', { bookingId });
  }, []);

  const sendGps = useCallback((bookingId: string, lat: number, lng: number) => {
    socketRef.current?.emit('mission:gps', { bookingId, lat, lng });
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      on,
      joinBooking,
      leaveBooking,
      sendGps,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
