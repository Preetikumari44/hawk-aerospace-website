import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { NotificationRequestDto } from './dto/notification-request.dto';
import { RegisterFcmTokenDto, UnregisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserType) {
    return this.notificationService.list(user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.notificationService.markRead(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.notificationService.remove(id, user);
  }

  /**
   * Register FCM token for push notifications
   * Called when user opens mobile app
   */
  @Post('fcm/register')
  async registerFcmToken(@Body() dto: RegisterFcmTokenDto, @CurrentUser() user: CurrentUserType) {
    await this.notificationService.registerFcmToken(
      user.uid,
      dto.fcmToken,
      dto.platform,
      dto.deviceId,
    );
    return { success: true, message: 'FCM token registered successfully' };
  }

  /**
   * Unregister FCM token
   * Called when user logs out
   */
  @Post('fcm/unregister')
  async unregisterFcmToken(@Body() dto: UnregisterFcmTokenDto, @CurrentUser() user: CurrentUserType) {
    await this.notificationService.unregisterFcmToken(user.uid, dto.fcmToken);
    return { success: true, message: 'FCM token unregistered successfully' };
  }

  /**
   * Get user's FCM tokens (for testing/debugging)
   */
  @Get('fcm/tokens')
  async getFcmTokens(@CurrentUser() user: CurrentUserType) {
    const tokens = await this.notificationService.getUserFcmTokens(user.uid);
    return { tokens, count: tokens.length };
  }

  @Post('broadcast')
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin')
  broadcast(@Body() dto: SendNotificationDto) {
    return this.notificationService.broadcast(dto);
  }

  /**
   * Multi-channel notification dispatch
   * Test with: POST /api/notifications/dispatch
   */
  @Post('dispatch')
  @Roles('admin', 'super_admin', 'state_admin', 'dept_admin')
  dispatch(@Body() dto: NotificationRequestDto) {
    return this.notificationService.dispatch(dto);
  }
}
