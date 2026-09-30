import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthGuard, type AuthenticatedSocket } from '../../gateway/ws-auth.guard';
import { CLIENT_EVENTS, WS_EVENTS } from '../../gateway/events/event.constants';
import type {
  ChatCallInitiatedPayload,
  ChatConversationCreatedPayload,
  ChatMessageReadPayload,
  ChatMessageSentPayload,
  ChatTypingPayload,
} from '../../gateway/events/event.interfaces';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.7:3000',
      'http://10.20.75.147:3000',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsAuthGuard)
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('chat:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    await client.join(`conversation:${data.conversationId}`);
    this.logger.debug(`${client.user.uid} joined conversation:${data.conversationId}`);
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    await client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): Promise<void> {
    this.server.to(`conversation:${data.conversationId}`).emit(CLIENT_EVENTS.CHAT_TYPING, {
      conversationId: data.conversationId,
      uid: client.user.uid,
      isTyping: data.isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent(WS_EVENTS.CHAT_MESSAGE_SENT)
  onMessageSent(payload: ChatMessageSentPayload): void {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(CLIENT_EVENTS.CHAT_MESSAGE_SENT, payload);
  }

  @OnEvent(WS_EVENTS.CHAT_MESSAGE_READ)
  onMessageRead(payload: ChatMessageReadPayload): void {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(CLIENT_EVENTS.CHAT_MESSAGE_READ, payload);
  }

  @OnEvent(WS_EVENTS.CHAT_CONVERSATION_CREATED)
  onConversationCreated(payload: ChatConversationCreatedPayload): void {
    for (const uid of payload.participants) {
      this.server
        .to(`user:${uid}`)
        .emit(CLIENT_EVENTS.CHAT_CONVERSATION_CREATED, payload);
    }
  }

  @OnEvent(WS_EVENTS.CHAT_CALL_INITIATED)
  onCallInitiated(payload: ChatCallInitiatedPayload): void {
    this.server
      .to(`user:${payload.targetUid}`)
      .emit(CLIENT_EVENTS.CHAT_CALL_INITIATED, payload);
  }
}