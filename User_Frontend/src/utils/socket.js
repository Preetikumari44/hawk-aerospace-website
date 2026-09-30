import { io } from 'socket.io-client';
import { getApiBaseUrl, getSession } from './api';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = async () => {
  if (socket?.connected) return socket;
  const baseUrl = await getApiBaseUrl();
  const wsUrl = baseUrl.replace('/api', '');
  const { accessToken } = await getSession();
  if (!accessToken) return null;
  socket = io(`${wsUrl}/ws`, {
    transports: ['websocket', 'polling'],
    auth: { token: accessToken },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinBookingRoom = (bookingId) => {
  if (socket?.connected) socket.emit('join:booking', { bookingId });
};

export const leaveBookingRoom = (bookingId) => {
  if (socket?.connected) socket.emit('leave:booking', { bookingId });
};

export const sendMissionGps = (bookingId, lat, lng, extras = {}) => {
  if (socket?.connected) {
    socket.emit('mission:gps', {
      bookingId,
      lat,
      lng,
      heading: extras.heading,
      speed: extras.speed,
      altitude: extras.altitude,
    });
  }
};

export const joinConversationRoom = (conversationId) => {
  if (socket?.connected) socket.emit('chat:join', { conversationId });
};

export const leaveConversationRoom = (conversationId) => {
  if (socket?.connected) socket.emit('chat:leave', { conversationId });
};

export const emitTyping = (conversationId, isTyping) => {
  if (socket?.connected) socket.emit('chat:typing', { conversationId, isTyping });
};
