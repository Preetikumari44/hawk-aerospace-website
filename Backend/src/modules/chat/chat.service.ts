import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CollectionReference, DocumentReference } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { ROOT_COLLECTIONS } from '../../common/constants/collection-paths.constant';
import { APP_ROLES } from '../../common/constants/roles.constant';
import type { CurrentUser } from '../../common/interfaces/current-user.interface';
import { paginateFirestoreQuery, type CursorPage } from '../../common/utils/firestore-cursor-pagination.util';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { WS_EVENTS } from '../../gateway/events/event.constants';
import { BookingService } from '../booking/booking.service';

export type SupportCategory = 'booking' | 'account' | 'marketplace' | 'other';

export interface ConversationDocument {
  id: string;
  participants: string[];
  participantRoles: Record<string, string>;
  bookingId?: string | null;
  orderId?: string | null;
  supportCategory?: SupportCategory | null;
  type: 'customer_pilot' | 'support';
  lastMessage?: ChatMessageDocument;
  lastActivityAt: string;
  unreadCount: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDocument {
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

export type PaginatedMessages = CursorPage<ChatMessageDocument>;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly bookingService: BookingService,
  ) {}

  private conversationsCollection(): CollectionReference<ConversationDocument> {
    return this.firebaseAdminService
      .firestore()
      .collection(ROOT_COLLECTIONS.conversations) as CollectionReference<ConversationDocument>;
  }

  private messagesCollection(conversationId: string): CollectionReference<ChatMessageDocument> {
    return this.conversationsCollection()
      .doc(conversationId)
      .collection('messages') as CollectionReference<ChatMessageDocument>;
  }

  async createConversation(
    payload: {
      participantUid: string;
      participantRole: string;
      bookingId?: string;
      orderId?: string;
      supportCategory?: SupportCategory;
      type: 'customer_pilot' | 'support';
    },
    user: CurrentUser,
  ): Promise<ConversationDocument> {
    if (payload.type === 'customer_pilot') {
      if (!payload.bookingId) {
        throw new BadRequestException('bookingId is required for customer_pilot conversations');
      }
      const canChat = await this.canChat(payload.bookingId, user.uid);
      if (!canChat) {
        throw new ForbiddenException('Chat is only available while the mission is active');
      }
    }

    // Resolve 'admin' placeholder UID to a real admin user
    let targetUid = payload.participantUid;
    let targetRole = payload.participantRole;
    if (targetUid === 'admin' && targetRole === 'admin') {
      const admin = await this.resolveAdminUid();
      if (admin) {
        targetUid = admin.uid;
        targetRole = admin.role;
        this.logger.log(`Resolved admin placeholder -> uid=${targetUid} role=${targetRole}`);
      } else {
        this.logger.warn('No admin user found in the system; creating conversation with placeholder uid');
      }
    }

    // ⭐ Reuse the existing active conversation instead of creating a new one.
    // Support threads are scoped per context so history is preserved per
    // booking / order / account / other topic until either side ends it:
    // - booking:     same bookingId
    // - marketplace: same orderId
    // - account/other: one thread per category
    const supportCategory = payload.supportCategory || null;
    const existing = await this.findExistingConversation(
      payload.type,
      payload.bookingId || null,
      user.uid,
      targetUid,
      payload.orderId || null,
      supportCategory,
    );
    if (existing) {
      this.logger.log(
        `Reusing existing ${payload.type} conversation ${existing.id} for user ${user.uid}`,
      );
      return existing;
    }

    const docRef = this.conversationsCollection().doc();
    const conversationId = docRef.id;
    const now = new Date().toISOString();

    const participants = [user.uid, targetUid];
    const participantRoles: Record<string, string> = {
      [user.uid]: user.role,
      [targetUid]: targetRole,
    };
    const unreadCount: Record<string, number> = {};
    for (const uid of participants) {
      unreadCount[uid] = 0;
    }

    const conversation: ConversationDocument = {
      id: conversationId,
      participants,
      participantRoles,
      bookingId: payload.bookingId || null,
      orderId: payload.orderId || null,
      supportCategory: payload.type === 'support' ? supportCategory : null,
      type: payload.type,
      lastActivityAt: now,
      unreadCount,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(conversation);

    this.eventEmitter.emit(WS_EVENTS.CHAT_CONVERSATION_CREATED, {
      conversationId,
      participants,
      participantRoles,
      type: payload.type,
      bookingId: payload.bookingId,
      orderId: payload.orderId || null,
      supportCategory: payload.type === 'support' ? supportCategory : null,
      timestamp: now,
    });

    return conversation;
  }

  async getConversations(user: CurrentUser): Promise<ConversationDocument[]> {
    // Conversations where the user is a direct participant
    const userSnapshot = await this.conversationsCollection()
      .where('participants', 'array-contains', user.uid)
      .orderBy('lastActivityAt', 'desc')
      .get();

    const results = userSnapshot.docs.map((doc) => doc.data());

    // Also fetch conversations using the 'admin' placeholder (legacy support)
    const isAdmin = ['admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin'].includes(user.role);
    if (isAdmin) {
      const adminSnapshot = await this.conversationsCollection()
        .where('participants', 'array-contains', 'admin')
        .orderBy('lastActivityAt', 'desc')
        .get();

      const existingIds = new Set(results.map((c) => c.id));
      for (const doc of adminSnapshot.docs) {
        const data = doc.data();
        if (!existingIds.has(data.id) && data.type === 'support') {
          results.push(data);
        }
      }

      // Sort merged results by lastActivityAt descending
      results.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    }

    return results;
  }

  async getConversation(id: string, user: CurrentUser): Promise<ConversationDocument> {
    const doc = await this.conversationsCollection().doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Conversation not found');
    }
    const conversation = doc.data() as ConversationDocument | undefined;
    if (!conversation) {
      throw new NotFoundException('Conversation data not found');
    }
    if (!conversation.participants.includes(user.uid)) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
    return conversation;
  }

  async getMessages(
    conversationId: string,
    user: CurrentUser,
    cursor?: string,
    limit = 50,
  ): Promise<PaginatedMessages> {
    await this.getConversation(conversationId, user);

    const query = this.messagesCollection(conversationId)
      .orderBy('createdAt', 'desc');

    const result = await paginateFirestoreQuery(query, {
      limit,
      cursor,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      getCursorValues: (msg: any) => [msg.createdAt],
    });

    return {
      items: result.items.reverse(),
      meta: result.meta,
    };
  }

  async sendMessage(
    conversationId: string,
    payload: { text: string; messageType?: 'text' | 'image' | 'call'; mediaUrl?: string },
    user: CurrentUser,
  ): Promise<ChatMessageDocument> {
    const conversation = await this.getConversation(conversationId, user);

    if (!conversation.isActive) {
      throw new ForbiddenException('This chat session has ended');
    }

    if (conversation.type === 'customer_pilot' && conversation.bookingId) {
      const canChat = await this.canChat(conversation.bookingId, user.uid);
      if (!canChat) {
        throw new ForbiddenException('Chat is no longer available for this booking');
      }
    }

    const msgRef = this.messagesCollection(conversationId).doc();
    const now = new Date().toISOString();
    const messageType = payload.messageType || 'text';

    const message: ChatMessageDocument = {
      id: msgRef.id,
      conversationId,
      senderUid: user.uid,
      senderRole: user.role,
      text: payload.text,
      messageType,
      mediaUrl: payload.mediaUrl || null,
      readBy: [user.uid],
      createdAt: now,
    };

    await msgRef.set(message);

    const unreadCount: Record<string, number> = {};
    for (const uid of conversation.participants) {
      unreadCount[uid] = uid === user.uid ? 0 : (conversation.unreadCount[uid] || 0) + 1;
    }

    await this.conversationsCollection().doc(conversationId).update({
      lastMessage: message,
      lastActivityAt: now,
      unreadCount,
      updatedAt: now,
    });

    this.eventEmitter.emit(WS_EVENTS.CHAT_MESSAGE_SENT, {
      conversationId,
      messageId: message.id,
      senderUid: user.uid,
      senderRole: user.role,
      text: payload.text,
      messageType,
      timestamp: now,
    });

    return message;
  }

  async markAsRead(conversationId: string, user: CurrentUser): Promise<void> {
    const conversation = await this.getConversation(conversationId, user);

    const batch = this.firebaseAdminService.firestore().batch();
    const now = new Date().toISOString();

    const messagesSnap = await this.messagesCollection(conversationId)
      .where('readBy', 'not-in', [[user.uid]])
      .get();

    for (const doc of messagesSnap.docs) {
      batch.update(doc.ref, {
        readBy: [...(doc.data().readBy || []), user.uid],
      });
    }

    const unreadCount = { ...conversation.unreadCount, [user.uid]: 0 };
    batch.update(this.conversationsCollection().doc(conversationId), {
      unreadCount,
      updatedAt: now,
    });

    await batch.commit();

    this.eventEmitter.emit(WS_EVENTS.CHAT_MESSAGE_READ, {
      conversationId,
      readBy: user.uid,
      timestamp: now,
    });
  }

  async initiateCall(conversationId: string, user: CurrentUser): Promise<void> {
    const conversation = await this.getConversation(conversationId, user);
    const targetUid = conversation.participants.find((p) => p !== user.uid);

    await this.sendMessage(conversationId, { text: 'Incoming call...', messageType: 'call' }, user);

    this.eventEmitter.emit(WS_EVENTS.CHAT_CALL_INITIATED, {
      conversationId,
      initiatedBy: user.uid,
      targetUid,
      timestamp: new Date().toISOString(),
    });
  }

  async deleteConversation(id: string, user: CurrentUser): Promise<void> {
    const conversation = await this.getConversation(id, user);

    // Either side of a support chat (user or admin) can end the session.
    // getConversation already guarantees the caller is a participant.
    if (!conversation.isActive) {
      return;
    }

    await this.conversationsCollection().doc(id).update({
      isActive: false,
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async canChat(bookingId: string, userUid: string): Promise<boolean> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      if (!booking) return false;

      if (booking.status === 'in_progress' && booking.actualStartTime) {
        return true;
      }

      if (booking.status === 'completed' && booking.paymentStatus === 'paid') {
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Find an existing ACTIVE conversation to reuse so users always continue
   * the same chat thread instead of spawning duplicates.
   *
   * - support (booking):    same type + bookingId + this user is a participant.
   * - support (marketplace):same type + orderId + this user is a participant.
   * - support (account/other): same type + same supportCategory + both participants.
   * - customer_pilot: same type + bookingId + this user is a participant.
   */
  private async findExistingConversation(
    type: 'customer_pilot' | 'support',
    bookingId: string | null,
    userUid: string,
    targetUid: string,
    orderId: string | null = null,
    supportCategory: SupportCategory | null = null,
  ): Promise<ConversationDocument | null> {
    const collection = this.conversationsCollection();
    const userSnapshot = await collection
      .where('participants', 'array-contains', userUid)
      .limit(200)
      .get();

    let results = userSnapshot.docs.map((doc) => doc.data());

    // Support chats may have been created with the literal 'admin' placeholder
    // before the admin uid was resolved. Fetch those too so we reuse them.
    if (type === 'support') {
      const adminSnapshot = await collection
        .where('participants', 'array-contains', 'admin')
        .limit(200)
        .get();
      const existingIds = new Set(results.map((c) => c.id));
      for (const doc of adminSnapshot.docs) {
        if (!existingIds.has(doc.id)) {
          results.push(doc.data());
        }
      }
    }

    const match = results.find((conversation) => {
      if (conversation.type !== type) return false;
      if (!conversation.isActive) return false;

      if (type === 'customer_pilot') {
        return (
          conversation.bookingId === bookingId && conversation.participants.includes(userUid)
        );
      }

      // Support chats are scoped per context.
      const convOrderId = (conversation as ConversationDocument).orderId || null;
      const convCategory =
        ((conversation as ConversationDocument).supportCategory || null) as SupportCategory | null;
      const sameParticipants =
        conversation.participants.includes(userUid) &&
        (conversation.participants.includes(targetUid) ||
          conversation.participants.includes('admin'));

      // Booking-scoped support: unique per booking.
      if (bookingId || supportCategory === 'booking') {
        return sameParticipants && (conversation.bookingId || null) === bookingId;
      }
      // Marketplace-scoped support: unique per order.
      if (orderId || supportCategory === 'marketplace') {
        return sameParticipants && convOrderId === orderId;
      }
      // Account / other: one thread per category.
      if (supportCategory) {
        return sameParticipants && convCategory === supportCategory;
      }

      // Legacy: no category supplied — reuse the per-pair thread.
      return sameParticipants;
    });

    return match || null;
  }

  private async resolveAdminUid(): Promise<{ uid: string; role: string } | null> {
    try {
      const adminRoles = ['admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin'];
      const snapshot = await this.firebaseAdminService
        .firestore()
        .collection(ROOT_COLLECTIONS.users)
        .where('role', 'in', adminRoles)
        .limit(5)
        .get();

      if (snapshot.empty) {
        return null;
      }

      // Pick an active admin; fall back to first found
      for (const doc of snapshot.docs) {
        const data = doc.data() as { role?: string; status?: string };
        if (data.status === 'active' || data.status === undefined) {
          return { uid: doc.id, role: data.role ?? 'admin' };
        }
      }

      const doc = snapshot.docs[0];
      const data = doc.data() as { role?: string };
      return { uid: doc.id, role: data.role ?? 'admin' };
    } catch (error) {
      this.logger.error('Failed to resolve admin UID', error);
      return null;
    }
  }
}