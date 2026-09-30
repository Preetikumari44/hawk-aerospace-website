import { ApiProperty } from '@nestjs/swagger';

export class AdminScopeDto {
  @ApiProperty()
  country: string;

  @ApiProperty()
  states: string[];

  @ApiProperty()
  districts: string[];

  @ApiProperty()
  regions: string[];

  @ApiProperty()
  cities: string[];
}

export class ManagedUsersDto {
  @ApiProperty()
  admins: number;

  @ApiProperty()
  fleetManagers: number;

  @ApiProperty()
  pilots: number;

  @ApiProperty()
  salesAggregators: number;

  @ApiProperty()
  customers: number;
}

export class AdminResponseDto {
  @ApiProperty()
  adminId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  employeeCode: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  photoUrl: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  designation: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  department: string;

  @ApiProperty()
  reportingTo: string | null;

  @ApiProperty()
  scope: AdminScopeDto;

  @ApiProperty()
  status: string;

  @ApiProperty()
  onlineStatus: string;

  @ApiProperty()
  lastLogin: string;

  @ApiProperty()
  joinedAt: string;

  @ApiProperty()
  permissionsProfile: string;

  @ApiProperty()
  managedUsers: ManagedUsersDto;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class AdminListResponseDto {
  @ApiProperty({ type: [AdminResponseDto] })
  data: AdminResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class AdminStatsDto {
  @ApiProperty()
  totalAdmins: number;

  @ApiProperty()
  superAdmins: number;

  @ApiProperty()
  stateAdmins: number;

  @ApiProperty()
  departmentAdmins: number;

  @ApiProperty()
  districtAdmins: number;

  @ApiProperty()
  activeAdmins: number;

  @ApiProperty()
  inactiveAdmins: number;
}
