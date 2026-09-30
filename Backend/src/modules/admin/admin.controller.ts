import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { AdminListResponseDto, AdminResponseDto, AdminStatsDto } from './dto/admin-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin Management')
@Controller('admins')
@ApiBearerAuth()
@Roles('admin', 'super_admin')  // Only admin and super_admin can manage admins
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admins with filters' })
  @ApiResponse({ status: 200, description: 'Returns list of admins', type: AdminListResponseDto })
  async findAll(@Query() query: AdminQueryDto): Promise<AdminListResponseDto> {
    return this.adminService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Returns admin stats', type: AdminStatsDto })
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'Returns list of departments' })
  async getDepartments(): Promise<any[]> {
    return this.adminService.getDepartments();
  }

  @Get('states')
  @ApiOperation({ summary: 'Get all states' })
  @ApiResponse({ status: 200, description: 'Returns list of states' })
  async getStates(): Promise<any[]> {
    return this.adminService.getStates();
  }

  @Get('permission-profiles')
  @ApiOperation({ summary: 'Get all permission profiles' })
  @ApiResponse({ status: 200, description: 'Returns list of permission profiles' })
  async getPermissionProfiles(): Promise<any[]> {
    return this.adminService.getPermissionProfiles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiResponse({ status: 200, description: 'Returns admin details', type: AdminResponseDto })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async findOne(@Param('id') id: string): Promise<AdminResponseDto> {
    return this.adminService.findOne(id);
  }

  @Get(':id/subordinates')
  @ApiOperation({ summary: 'Get admins reporting to this admin' })
  @ApiResponse({ status: 200, description: 'Returns list of subordinate admins', type: AdminListResponseDto })
  async findSubordinates(
    @Param('id') id: string,
    @Query() query: AdminQueryDto,
  ): Promise<AdminListResponseDto> {
    return this.adminService.findSubordinates(id, query);
  }

  @Get(':id/department-admins/:department')
  @ApiOperation({ summary: 'Get department admins for a specific admin' })
  @ApiResponse({ status: 200, description: 'Returns list of department admins' })
  async findDepartmentAdmins(
    @Param('id') id: string,
    @Param('department') department: string,
  ): Promise<AdminResponseDto[]> {
    return this.adminService.findDepartmentAdmins(id, department);
  }

  @Post()
  @ApiOperation({ summary: 'Create new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully', type: AdminResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createAdminDto: CreateAdminDto,
    // @CurrentUser() user: any, // Get from auth guard
  ): Promise<AdminResponseDto> {
    // TODO: Get createdBy from authenticated user
    const createdBy = 'ADM0000'; // Placeholder
    return this.adminService.create(createAdminDto, createdBy);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update admin' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully', type: AdminResponseDto })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    // @CurrentUser() user: any,
  ): Promise<AdminResponseDto> {
    // TODO: Get updatedBy from authenticated user
    const updatedBy = 'ADM0000'; // Placeholder
    return this.adminService.update(id, updateAdminDto, updatedBy);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete admin (soft delete)' })
  @ApiResponse({ status: 204, description: 'Admin deleted successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async remove(
    @Param('id') id: string,
    // @CurrentUser() user: any,
  ): Promise<void> {
    // TODO: Get deletedBy from authenticated user
    const deletedBy = 'ADM0000'; // Placeholder
    return this.adminService.remove(id, deletedBy);
  }
}
