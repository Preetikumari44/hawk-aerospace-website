import { api } from './client';

export interface ChatUser {
  uid: string;
  name: string;
  role: string;
  avatar?: string;
}

export type SupportCategory = 'booking' | 'account' | 'marketplace' | 'other';

export interface Conversation {
  id: string;
  participants: string[];
  participantRoles: Record<string, string>;
  bookingId?: string | null;
  orderId?: string | null;
  supportCategory?: SupportCategory | null;
  type: 'customer_pilot' | 'support';
  lastMessage?: {
    id: string;
    senderUid: string;
    senderRole: string;
    text: string;
    messageType: string;
    createdAt: string;
  } | null;
  lastActivityAt: string;
  unreadCount: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderRole: string;
  text: string;
  messageType: 'text' | 'image' | 'call';
  mediaUrl?: string | null;
  readBy: string[];
  createdAt: string;
}

export interface PaginatedMessages {
  items: ChatMessage[];
  meta: {
    limit: number;
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export const chatApi = {
  getConversations: () =>
    api.get<Conversation[]>('/chat/conversations'),

  getConversation: (id: string) =>
    api.get<Conversation>(`/chat/conversations/${id}`),

  getMessages: (conversationId: string, cursor?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', String(limit));
    return api.get<PaginatedMessages>(`/chat/conversations/${conversationId}/messages?${params.toString()}`);
  },

  sendMessage: (conversationId: string, text: string) =>
    api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { text }),

  createConversation: (dto: { participantUid: string; participantRole: string; bookingId?: string; orderId?: string; supportCategory?: SupportCategory; type: 'customer_pilot' | 'support' }) =>
    api.post<Conversation>('/chat/conversations', dto),

  markAsRead: (conversationId: string) =>
    api.patch<void>(`/chat/conversations/${conversationId}/read`),

  endConversation: (conversationId: string) =>
    api.delete<void>(`/chat/conversations/${conversationId}`),
};
