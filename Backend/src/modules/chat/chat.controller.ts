import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  createConversation(
    @Body() dto: { participantUid: string; participantRole: string; bookingId?: string; orderId?: string; supportCategory?: 'booking' | 'account' | 'marketplace' | 'other'; type: 'customer_pilot' | 'support' },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.chatService.createConversation(dto, user);
  }

  @Get('conversations')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  getConversations(@CurrentUser() user: CurrentUserType) {
    return this.chatService.getConversations(user);
  }

  @Get('conversations/:id')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  getConversation(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.chatService.getConversation(id, user);
  }

  @Get('conversations/:id/messages')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  getMessages(
    @Param('id') id: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.chatService.getMessages(id, user, cursor, limit ? parseInt(limit, 10) : 50);
  }

  @Post('conversations/:id/messages')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: { text: string; messageType?: 'text' | 'image' | 'call'; mediaUrl?: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.chatService.sendMessage(id, dto, user);
  }

  @Patch('conversations/:id/read')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  markAsRead(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.chatService.markAsRead(id, user);
  }

  @Post('conversations/:id/call')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  initiateCall(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.chatService.initiateCall(id, user);
  }

  @Delete('conversations/:id')
  @Roles('customer', 'pilot', 'aggregator', 'fleet_manager', 'vendor', 'technician', 'admin', 'subadmin', 'super_admin', 'state_admin', 'dept_admin')
  deleteConversation(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.chatService.deleteConversation(id, user);
  }
}