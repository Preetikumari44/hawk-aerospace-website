import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { chatApi, type Conversation, type ChatMessage } from '../api/chat.api';
import { usersApi, type ChatUserProfile } from '../api/users.api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import MessageIcon from '../assets/icons/MessageIcon.svg';
import ArrowBackwardIcon from '../assets/icons/ArrowBackwardIcon.svg';
import SendIcon from '../assets/icons/ArrowForwardIcon.svg';
import PersonIcon from '../assets/icons/person-icon.svg';

type ViewState = 'list' | 'chat';

export default function ChatScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [viewState, setViewState] = useState<ViewState>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, ChatUserProfile>>({});
  const flatListRef = useRef<FlatList>(null);
  const currentConvIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await chatApi.getConversations();
      const list = res.data || [];
      setConversations(list);
      // Enrich the other participant's phone / city / state / pincode.
      const myUid = (user as any)?.uid;
      const uids = Array.from(new Set(
        list
          .map((c) => c.participants.find((p) => p !== myUid))
          .filter((u): u is string => !!u && u !== 'admin'),
      ));
      setUserProfiles((prev) => {
        const missing = uids.filter((u) => !prev[u]);
        if (missing.length === 0) return prev;
        missing.forEach((uid) => {
          usersApi.getByUid(uid)
            .then((profile) => {
              setUserProfiles((cur) => ({ ...cur, [uid]: (profile.data as ChatUserProfile) || (profile as unknown as ChatUserProfile) }));
            })
            .catch(() => {});
        });
        return prev;
      });
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await chatApi.getMessages(conversationId);
      const msgs = (res.data as any)?.items || (res.data as any) || [];
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, []);

  // Join conversation room for real-time events
  const joinRoom = useCallback((conversationId: string) => {
    if (socket?.connected) {
      socket.emit('chat:join', { conversationId });
      console.log('[ChatScreen] Joined conversation room:', conversationId);
    }
    currentConvIdRef.current = conversationId;
  }, [socket]);

  const leaveRoom = useCallback((conversationId: string) => {
    if (socket?.connected) {
      socket.emit('chat:leave', { conversationId });
      console.log('[ChatScreen] Left conversation room:', conversationId);
    }
    currentConvIdRef.current = null;
  }, [socket]);

  const openConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    setViewState('chat');
    joinRoom(conv.id);
    await loadMessages(conv.id);
    chatApi.markAsRead(conv.id).catch(() => {});
  }, [loadMessages, joinRoom]);

  const handleBack = useCallback(() => {
    if (activeConversation) leaveRoom(activeConversation.id);
    setViewState('list');
    setActiveConversation(null);
    setMessages([]);
    loadConversations();
  }, [loadConversations, activeConversation, leaveRoom]);

  const handleEndConversation = useCallback(() => {
    if (!activeConversation) return;
    Alert.alert(
      'End Chat',
      'End this chat session? The user will start a new chat the next time they open support.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Chat',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatApi.endConversation(activeConversation.id);
              leaveRoom(activeConversation.id);
              setViewState('list');
              setActiveConversation(null);
              setMessages([]);
              loadConversations();
            } catch (err) {
              console.error('Failed to end conversation', err);
              Alert.alert('Error', 'Failed to end chat. Please try again.');
            }
          },
        },
      ],
    );
  }, [activeConversation, loadConversations, leaveRoom]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !activeConversation || sending) return;
    setSending(true);
    setInputText('');
    try {
      await chatApi.sendMessage(activeConversation.id, text);
    } catch (err) {
      console.error('Failed to send message', err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, activeConversation, sending]);

  // Listen for real-time messages on the active conversation
  useEffect(() => {
    if (!socket || !activeConversation) return;
    const handler = (data: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.messageId)) return prev;
        return [...prev, {
          id: data.messageId || Date.now().toString(),
          conversationId: data.conversationId,
          senderUid: data.senderUid,
          senderRole: data.senderRole,
          text: data.text,
          messageType: data.messageType || 'text',
          readBy: [],
          createdAt: data.timestamp || new Date().toISOString(),
        }];
      });
    };
    socket.on('chat:message:sent' as any, handler);
    return () => { socket.off('chat:message:sent' as any, handler); };
  }, [socket, activeConversation]);

  // Refresh conversation list when a new one is created
  useEffect(() => {
    if (!socket) return;
    const handler = () => { loadConversations(); };
    socket.on('chat:conversation:created' as any, handler);
    return () => { socket.off('chat:conversation:created' as any, handler); };
  }, [socket, loadConversations]);

  const getOtherParticipant = (conv: Conversation) => {
    if (!user) return { name: 'Unknown', role: '', uid: '' };
    const otherUid = conv.participants.find((p) => p !== (user as any).uid) || '';
    return {
      uid: otherUid,
      name: otherUid || 'Unknown',
      role: otherUid ? (conv.participantRoles[otherUid] || '') : '',
    };
  };

  const getProfileLine = (uid: string) => {
    const profile = userProfiles[uid];
    if (!profile) return '';
    const phone = (profile as any)?.phone || '';
    const pd = (profile as any)?.profileData || {};
    const city = pd.city || pd.district || '';
    const state = pd.state || '';
    const pincode = pd.pincode || '';
    const location = [city, state, pincode].filter(Boolean).join(', ');
    return [phone, location].filter(Boolean).join(' • ');
  };

  const getContextLabel = (conv: Conversation) => {
    const refId = conv.bookingId || (conv as any).orderId;
    const category = (conv as any).supportCategory;
    if (refId) return `#${refId}`;
    if (category) return category;
    return '';
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(iso);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5060D3" />
      </View>
    );
  }

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item);
    const unread = user ? (item.unreadCount[(user as any).uid] || 0) : 0;
    const profileLine = getProfileLine(other.uid);
    const contextLabel = getContextLabel(item);
    return (
      <TouchableOpacity style={styles.convItem} onPress={() => openConversation(item)}>
        <View style={styles.avatar}>
          <PersonIcon width={24} height={24} fill="#6B7280" />
        </View>
        <View style={styles.convContent}>
          <View style={styles.convHeader}>
            <Text style={styles.convName} numberOfLines={1}>{other.name}</Text>
            {item.lastMessage && (
              <Text style={styles.convTime}>{formatDate(item.lastMessage.createdAt)}</Text>
            )}
          </View>
          <View style={styles.convSub}>
            <Text style={styles.convRole}>
              {other.role}{contextLabel ? ` • ${contextLabel}` : ''}
            </Text>
            {profileLine ? (
              <Text style={styles.convProfile} numberOfLines={1}>{profileLine}</Text>
            ) : null}
            {item.lastMessage && (
              <Text style={styles.convPreview} numberOfLines={1}>{item.lastMessage.text}</Text>
            )}
          </View>
        </View>
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = user && item.senderUid === (user as any).uid;
    const senderLabel = isMine ? 'You' : item.senderRole || 'User';
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine && (
          <Text style={styles.msgSenderLabel}>{senderLabel}</Text>
        )}
        <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.text}</Text>
          <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>{formatTime(item.createdAt)}</Text>
        </View>
        {isMine && (
          <Text style={[styles.msgSenderLabel, styles.msgSenderLabelMine]}>{senderLabel}</Text>
        )}
      </View>
    );
  };

  if (viewState === 'chat' && activeConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowBackwardIcon width={24} height={24} fill="#374151" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {getOtherParticipant(activeConversation).name}
            </Text>
            <Text style={styles.chatHeaderRole}>
              {getOtherParticipant(activeConversation).role}
            </Text>
            {getProfileLine(getOtherParticipant(activeConversation).uid) ? (
              <Text style={styles.chatHeaderProfile} numberOfLines={1}>
                {getProfileLine(getOtherParticipant(activeConversation).uid)}
              </Text>
            ) : null}
          </View>
          {(activeConversation.bookingId || (activeConversation as any).orderId || getContextLabel(activeConversation)) && (
            <Text style={styles.chatBookingId}>
              {getContextLabel(activeConversation)}
            </Text>
          )}
          <TouchableOpacity style={styles.endChatBtn} onPress={handleEndConversation}>
            <Text style={styles.endChatText}>End</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            blurOnSubmit
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <SendIcon width={20} height={20} fill="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageIcon width={24} height={24} fill="#374151" />
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={loadConversations} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageIcon width={48} height={48} fill="#D1D5DB" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Customer support chats will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginLeft: 10, flex: 1 },
  refreshBtn: { padding: 4 },
  refreshText: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  convContent: { flex: 1, marginLeft: 12 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  convTime: { fontSize: 12, color: '#9CA3AF', marginLeft: 8 },
  convSub: { flexDirection: 'column', marginTop: 2 },
  convRole: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  convProfile: { fontSize: 12, color: '#4B5563', marginTop: 1 },
  convPreview: { fontSize: 13, color: '#9CA3AF', marginTop: 1 },
  unreadBadge: { backgroundColor: '#5060D3', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 76 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  backBtn: { padding: 4, marginRight: 8 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  chatHeaderRole: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  chatHeaderProfile: { fontSize: 11, color: '#4B5563', marginTop: 1 },
  chatBookingId: { fontSize: 12, color: '#9CA3AF', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  endChatBtn: { marginLeft: 10, backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  endChatText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 16, paddingVertical: 12 },
  msgRow: { marginBottom: 8, flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgSenderLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2, marginHorizontal: 4, textTransform: 'capitalize' },
  msgSenderLabelMine: { textAlign: 'right' },
  msgBubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  msgBubbleMine: { backgroundColor: '#5060D3', borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  msgTextMine: { color: '#FFFFFF' },
  msgTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#111827' },
  sendBtn: { backgroundColor: '#5060D3', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.5 },
});
