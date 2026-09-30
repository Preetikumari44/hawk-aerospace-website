import { Controller, Get, Post } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { SyncService } from './sync.service';

@Controller('sync')
@Roles('admin', 'super_admin')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  status() {
    return this.syncService.getStatus();
  }

  @Post('start')
  start() {
    return this.syncService.start();
  }

  @Post('stop')
  stop() {
    return this.syncService.stop();
  }
}
