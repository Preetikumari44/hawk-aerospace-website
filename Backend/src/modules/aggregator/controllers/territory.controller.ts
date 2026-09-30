import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../common/interfaces/current-user.interface';
import { TerritoryService } from '../services/territory.service';
import { AssignTerritoryDto, CheckTerritoryDto, TerritoryFilterDto } from '../dto/territory.dto';

@Controller('territories')
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  /**
   * Assign territory to aggregator (Admin only)
   */
  @Post()
  @Roles('admin', 'super_admin')
  assignTerritory(@Body() dto: AssignTerritoryDto) {
    return this.territoryService.assignTerritory(dto);
  }

  /**
   * Get territories by filter
   */
  @Get()
  @Roles('admin', 'super_admin', 'aggregator')
  getTerritories(@Query() filter: TerritoryFilterDto) {
    return this.territoryService.getTerritories(filter);
  }

  /**
   * Find eligible aggregators for a location
   */
  @Post('check')
  @Roles('admin', 'super_admin', 'vendor')
  checkTerritory(@Body() dto: CheckTerritoryDto) {
    return this.territoryService.findAggregatorsForLocation(dto);
  }

  /**
   * Update territory
   */
  @Patch(':territoryId')
  @Roles('admin', 'super_admin')
  updateTerritory(
    @Param('territoryId') territoryId: string,
    @Body() dto: Partial<AssignTerritoryDto>,
  ) {
    return this.territoryService.updateTerritory(territoryId, dto);
  }

  /**
   * Delete territory
   */
  @Delete(':territoryId')
  @Roles('admin', 'super_admin')
  deleteTerritory(@Param('territoryId') territoryId: string) {
    return this.territoryService.deleteTerritory(territoryId);
  }
}
