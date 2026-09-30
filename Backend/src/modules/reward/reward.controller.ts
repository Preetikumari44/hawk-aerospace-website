import { Body, Controller, Get, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { RedeemDto } from './dto/redeem.dto';
import { RewardService } from './reward.service';

@Controller('pilots/rewards')
@Roles('pilot')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  summary(@CurrentUser() user: CurrentUserType) {
    return this.rewardService.summary(user);
  }

  @Post('redeem')
  redeem(@Body() dto: RedeemDto, @CurrentUser() user: CurrentUserType) {
    return this.rewardService.redeem(dto, user);
  }

  @Get('history')
  history(@CurrentUser() user: CurrentUserType) {
    return this.rewardService.history(user);
  }
}
