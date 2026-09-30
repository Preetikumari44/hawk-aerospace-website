import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import BackIcon from '../assets/images/ArrowBackwardIcon.svg';
import CallIcon from '../assets/images/Right-Group.svg';
import AvatarIcon from '../assets/images/Avatar.svg';
import PlusIcon from '../assets/images/PlusIcon.svg';
import IconSvg from '../assets/images/icon.svg';
import CameraSvg from '../assets/images/Button.svg';
import LocationSvg from '../assets/images/Buttonlocation.svg';
import GallerySvg from '../assets/images/MediaButtonBG.svg';
import { chatApi, getSession } from '../../utils/api';
import { connectSocket, joinConversationRoom, leaveConversationRoom, emitTyping } from '../../utils/socket';
import { useLanguage } from '../../i18n';
import { useTabBarPadding } from '../../utils/responsive';

const ChatScreen = ({ onNavigate, routeParams }) => {
  const { t, locale } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const conversationId = routeParams?.conversationId;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [participantName, setParticipantName] = useState(t('Support'));
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [refId, setRefId] = useState(routeParams?.refId || null);
  const [refTitle, setRefTitle] = useState(routeParams?.refTitle || null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) setCurrentUser(session.user);
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await chatApi.getMessages(conversationId);
      const items = data.items || data || [];
      const seen = new Set();
      setMessages(items.filter(msg => {
        if (!msg.id) return true;
        if (seen.has(msg.id)) return false;
        seen.add(msg.id);
        return true;
      }));
      await chatApi.markAsRead(conversationId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [conversationId]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    try {
      const conversation = await chatApi.getConversation(conversationId);
      const uid = currentUser?.uid || routeParams?.currentUid;
      const otherUid = conversation.participants?.find(p => p !== uid);
      if (conversation.type === 'support') {
        setParticipantName(t('Support Team'));
      } else if (otherUid) {
        setParticipantName(otherUid === uid ? t('Support') : t('Pilot'));
      }
      setIsActive(conversation.isActive !== false);
      // Show the linked booking/order id in the chat header.
      const linkedId = conversation.bookingId || conversation.orderId || routeParams?.refId || null;
      if (linkedId) setRefId(linkedId);
      if (routeParams?.refTitle) setRefTitle(routeParams.refTitle);
      if (!conversation.isActive) {
        setParticipantName(t('Support Team'));
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [conversationId, routeParams?.currentUid, routeParams?.refId, routeParams?.refTitle, currentUser, t]);

  useEffect(() => {
    loadMessages();
    loadConversation();
  }, [loadMessages, loadConversation]);

  useEffect(() => {
    if (!conversationId) return;
    const initSocket = async () => {
      const sock = await connectSocket();
      if (sock) {
        if (sock.connected) {
          joinConversationRoom(conversationId);
        } else {
          sock.once('connect', () => joinConversationRoom(conversationId));
        }
        sock.on('chat:message:sent', (data) => {
          if (data.conversationId === conversationId) {
            loadMessages();
          }
        });
        sock.on('chat:call:initiated', (data) => {
          if (data.conversationId === conversationId) {
            Alert.alert(t('Incoming Call'), t('A call has been initiated'));
          }
        });
        sock.on('chat:typing', (data) => {
          if (data.conversationId === conversationId && data.isTyping) {
            setIsTyping(true);
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
          }
        });
      }
    };
    initSocket();
    return () => {
      if (conversationId) leaveConversationRoom(conversationId);
    };
  }, [conversationId, loadMessages, t]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !conversationId) return;
    if (!isActive) {
      Alert.alert(t('Chat ended'), t('This conversation has ended. Start a new support chat for further help.'));
      return;
    }
    const text = inputText.trim();
    setInputText('');
    try {
      await chatApi.sendMessage(conversationId, { text, messageType: 'text' });
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      const status = error?.status || error?.response?.status;
      if (status === 403) {
        setIsActive(false);
        Alert.alert(t('Chat ended'), t('This conversation has ended.'));
      }
    }
  }, [inputText, conversationId, loadMessages, isActive, t]);

  const handleEndChat = useCallback(() => {
    if (!conversationId) return;
    Alert.alert(
      t('End Chat'),
      t('End this conversation? You can start a new one anytime from support.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('End Chat'),
          style: 'destructive',
          onPress: async () => {
            try {
              await chatApi.deleteConversation(conversationId);
              setIsActive(false);
              await loadConversation();
            } catch (error) {
              console.error('Failed to end chat:', error);
              Alert.alert(t('Error'), t('Could not end the chat. Please try again.'));
            }
          },
        },
      ],
    );
  }, [conversationId, loadConversation, t]);

  const handleCall = useCallback(async () => {
    if (!conversationId) return;
    try {
      await chatApi.initiateCall(conversationId);
      Alert.alert(t('Call Initiated'), t('Call notification sent'));
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  }, [conversationId, t]);

  const handleInputChange = useCallback((text) => {
    setInputText(text);
    if (conversationId) {
      emitTyping(conversationId, text.length > 0);
    }
  }, [conversationId]);

  const renderMessageItem = ({ item }) => {
    const isMe = currentUser && (item.senderUid === currentUser.uid || item.senderRole === currentUser.role);
    const senderLabel = isMe ? t('You') : (participantName || item.senderRole || t('Support'));
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && <Text style={styles.senderLabel}>{senderLabel}</Text>}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          <View style={styles.metaContainer}>
            <Text style={[styles.timeText, isMe && styles.timeTextMine]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
            {isMe && (
              <MaterialIcons
                name="done-all"
                size={14}
                color={item.readBy?.length > 1 ? '#4B77FA' : '#9CA3AF'}
                style={styles.checkIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const isReadOnly = routeParams?.readOnly === true || !isActive;
  const isWeb = Platform.OS === 'web';

  const chatBody = (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')} style={styles.backButton}>
            <BackIcon width={22} height={22} color="#4B5563" />
          </Pressable>
          <View style={styles.profileContainer}>
            <View style={styles.avatarWrapper}>
              <AvatarIcon width={40} height={40} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{participantName}</Text>
              {refId ? (
                <Text style={styles.refIdText}>ID: #{refId}</Text>
              ) : null}
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, isOnline && styles.onlineDot]} />
                <Text style={styles.statusText}>{!isActive ? t('Ended') : isOnline ? t('Online') : t('Offline')}</Text>
              </View>
            </View>
          </View>
          {isActive ? (
          <Pressable style={styles.endButton} onPress={handleEndChat}>
            <Text style={styles.endButtonText}>{t('End')}</Text>
          </Pressable>
          ) : null}
          <Pressable style={styles.callButton} onPress={handleCall}>
            <CallIcon width={28} height={28} />
          </Pressable>
        </View>

        <View style={styles.chatAreaWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id || item._id || Math.random())}
            renderItem={renderMessageItem}
            contentContainerStyle={[styles.chatListContent, { paddingBottom: 16 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{t('typing...')}</Text>
            </View>
          )}

          {!isActive && (
            <View style={styles.endedBanner}>
              <Text style={styles.endedText}>{t('This conversation has ended.')}</Text>
            </View>
          )}

          {showMenu && (
            <View style={styles.floatingMenuContainer}>
              <Pressable onPress={() => { alert('Gallery Pressed'); setShowMenu(false); }} style={styles.menuItem}>
                <GallerySvg width={50} height={50} />
              </Pressable>
              <Pressable onPress={() => { alert('Camera Pressed'); setShowMenu(false); }} style={styles.menuItem}>
                <CameraSvg width={50} height={50} />
              </Pressable>
              <Pressable onPress={() => { alert('Location Pressed'); setShowMenu(false); }} style={styles.menuItem}>
                <LocationSvg width={50} height={50} />
              </Pressable>
            </View>
          )}
        </View>

        {!isReadOnly && (
          <View style={[styles.inputContainer, { marginBottom: tabBarPadding }]}>
            <Pressable
              onPress={() => setShowMenu(!showMenu)}
              style={[styles.actionIconButton, showMenu && styles.rotatedPlus]}
            >
              <PlusIcon width={24} height={24} />
            </Pressable>
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder={t('Type a message')}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={handleInputChange}
                blurOnSubmit
                onSubmitEditing={handleSend}
                multiline={Platform.OS !== 'web'}
              />
            </View>
            <Pressable
              onPress={inputText.trim().length > 0 ? handleSend : undefined}
              style={styles.actionIconButton}
            >
              <IconSvg width={24} height={24} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isWeb ? <View style={styles.webContent}>{chatBody}</View> : chatBody}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  webContent: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: { paddingRight: 8 },
  profileContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  avatarWrapper: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  profileInfo: { marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  refIdText: { fontSize: 12, fontWeight: '600', color: '#5060D3', marginTop: 1 },
  endButton: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 4 },
  endButtonText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  endedBanner: { backgroundColor: '#FEF2F2', borderTopWidth: 1, borderTopColor: '#FECACA', paddingVertical: 8, paddingHorizontal: 16 },
  endedText: { fontSize: 12, color: '#B91C1C', textAlign: 'center', fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB', marginRight: 4 },
  onlineDot: { backgroundColor: '#10B981' },
  statusText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  callButton: { padding: 6 },
  chatAreaWrapper: { flex: 1, position: 'relative' },
  chatListContent: { paddingHorizontal: 16, paddingVertical: 16 },
  messageRow: { flexDirection: 'row', marginVertical: 6, width: '100%' },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  senderLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2, marginHorizontal: 4, textTransform: 'capitalize' },
  myBubble: { backgroundColor: '#5060D3', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: '#374151' },
  metaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 10, color: '#6B7280', textAlign: 'right' },
  timeTextMine: { color: 'rgba(255,255,255,0.7)' },
  checkIcon: { marginLeft: 4 },
  typingIndicator: { paddingHorizontal: 20, paddingBottom: 4 },
  typingText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  floatingMenuContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'transparent',
    gap: 10,
    zIndex: 99,
    alignItems: 'center',
  },
  menuItem: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionIconButton: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  rotatedPlus: { transform: [{ rotate: '45deg' }] },
  textInputWrapper: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, marginHorizontal: 8, paddingHorizontal: 16, maxHeight: 100, justifyContent: 'center' },
  textInput: { fontSize: 14, color: '#1F2937', paddingVertical: Platform.OS === 'ios' ? 8 : 4 },
});

export default ChatScreen;
