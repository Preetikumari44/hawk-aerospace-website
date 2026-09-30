import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { getClientIp, getUserAgent, getDeviceInfo } from '../../common/utils/request.util';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthRateLimitGuard } from '../../common/guards/auth-rate-limit.guard';
import { AuthService } from './auth.service';

@UseGuards(AuthRateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const deviceInfo = getDeviceInfo(req);
    return this.authService.verifyOtp(dto, ipAddress, userAgent, deviceInfo);
  }

  @Public()
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const deviceInfo = getDeviceInfo(req);
    return this.authService.adminLogin(dto, ipAddress, userAgent, deviceInfo);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Post('logout')
  logout(
    @Headers('authorization') authorization: string,
    @Body() dto?: LogoutDto,
  ) {
    // Extract access token from Authorization header
    const accessToken = authorization?.replace('Bearer ', '');
    return this.authService.logout(accessToken, dto);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('switch-role')
  switchRole(
    @Body() dto: SwitchRoleDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const deviceInfo = getDeviceInfo(req);
    return this.authService.switchRole(dto, user, ipAddress, userAgent, deviceInfo);
  }
}
