import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import { ConsentService } from '../services/consent.service';
import {
  ConsentFilterDto,
  RequestConsentDto,
  UpdateConsentDto,
} from '../dto/consent.dto';

@Controller('consents')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  /**
   * Request consent from customer (Aggregator)
   */
  @Post('request')
  @Roles('aggregator')
  requestConsent(
    @Body() dto: RequestConsentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.consentService.requestConsent(dto, user);
  }

  /**
   * Get my pending consent requests (Aggregator)
   */
  @Get('pending')
  @Roles('aggregator')
  getPendingConsents(@CurrentUser() user: CurrentUserType) {
    return this.consentService.getPendingConsents(user.uid);
  }

  /**
   * Get consents by filter (Aggregator)
   */
  @Get()
  @Roles('aggregator')
  getConsents(@Query() filter: ConsentFilterDto, @CurrentUser() user: CurrentUserType) {
    // Force filter to current aggregator
    filter.aggregatorId = user.uid;
    return this.consentService.getConsents(filter);
  }

  /**
   * Respond to consent request (Customer)
   */
  @Patch(':consentId/respond')
  @Roles('customer')
  respondToConsent(
    @Param('consentId') consentId: string,
    @Body() dto: UpdateConsentDto,
    @CurrentUser() user: CurrentUserType,
    @Req() req: Request,
  ) {
    const metadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    };
    return this.consentService.respondToConsent(consentId, dto, user, metadata);
  }

  /**
   * Get my consent history (Customer)
   */
  @Get('my-consents')
  @Roles('customer')
  getMyConsents(@CurrentUser() user: CurrentUserType) {
    return this.consentService.getCustomerConsentHistory(user.uid);
  }

  /**
   * Revoke consent (Customer)
   */
  @Patch(':consentId/revoke')
  @Roles('customer')
  revokeConsent(
    @Param('consentId') consentId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.consentService.revokeConsent(consentId, user);
  }

  /**
   * Check if customer has granted consent (Aggregator utility)
   */
  @Get('check/:customerId/:consentType')
  @Roles('aggregator')
  checkConsent(
    @Param('customerId') customerId: string,
    @Param('consentType') consentType: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.consentService.hasConsent(customerId, user.uid, consentType as any);
  }
}
