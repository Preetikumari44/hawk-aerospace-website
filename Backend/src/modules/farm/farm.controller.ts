import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FarmService } from './farm.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { FarmFilterDto } from './dto/farm-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';

@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  /**
   * Create a new farm
   * POST /api/farms
   * Body: CreateFarmDto
   * Query: customerUid (optional, for admins/aggregators)
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 creates per minute
  @Roles('customer', 'admin', 'super_admin', 'subadmin', 'aggregator')
  create(
    @Body() createFarmDto: CreateFarmDto,
    @Query('customerUid') customerUid: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.farmService.create(createFarmDto, user, customerUid);
  }

  /**
   * List all farms for a customer
   * GET /api/farms
   * Query: FarmFilterDto (customerUid, isActive, state, district, crop, season, page, limit)
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })  // 30 reads per minute
  @Roles('customer', 'admin', 'super_admin', 'subadmin', 'aggregator')
  findAll(
    @Query() filter: FarmFilterDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.farmService.findAll(filter, user);
  }

  /**
   * Get farm statistics for a customer
   * GET /api/farms/stats
   * Query: customerUid (required for admins, optional for customers)
   */
  @Get('stats')
  @Throttle({ default: { limit: 20, ttl: 60000 } })  // 20 reads per minute
  @Roles('customer', 'admin', 'super_admin', 'subadmin', 'aggregator')
  getStats(
    @Query('customerUid') customerUid: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    const targetUid = customerUid || user.uid;
    return this.farmService.getStats(targetUid, user);
  }

  /**
   * Get a specific farm by farmId
   * GET /api/farms/:farmId
   * Query: customerUid (optional for customers, required for others)
   */
  @Get(':farmId')
  @Throttle({ default: { limit: 40, ttl: 60000 } })  // 40 reads per minute
  @Roles('customer', 'admin', 'super_admin', 'subadmin', 'aggregator', 'pilot')
  findOne(
    @Param('farmId') farmId: string,
    @Query('customerUid') customerUid: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.farmService.findOne(farmId, user, customerUid);
  }

  /**
   * Update a farm
   * PATCH /api/farms/:farmId
   * Query: customerUid (optional for customers, required for others)
   */
  @Patch(':farmId')
  @Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 updates per minute
  @Roles('customer', 'admin', 'super_admin', 'subadmin', 'aggregator')
  update(
    @Param('farmId') farmId: string,
    @Body() updateFarmDto: UpdateFarmDto,
    @Query('customerUid') customerUid: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.farmService.update(farmId, updateFarmDto, user, customerUid);
  }

  /**
   * Delete (deactivate) a farm
   * DELETE /api/farms/:farmId
   * Query: customerUid (optional for customers, required for others)
   */
  @Delete(':farmId')
  @Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 deletes per minute
  @Roles('customer', 'admin', 'super_admin', 'subadmin')
  remove(
    @Param('farmId') farmId: string,
    @Query('customerUid') customerUid: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.farmService.remove(farmId, user, customerUid);
  }
}
