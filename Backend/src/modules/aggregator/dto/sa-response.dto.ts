import { Expose, Transform } from 'class-transformer';

function toIsoTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();

  const candidate = value as {
    _seconds?: unknown;
    seconds?: unknown;
    toDate?: unknown;
  };

  if (typeof candidate.toDate === 'function') {
    return candidate.toDate().toISOString();
  }

  const seconds =
    typeof candidate._seconds === 'number'
      ? candidate._seconds
      : typeof candidate.seconds === 'number'
        ? candidate.seconds
        : undefined;

  return seconds === undefined ? undefined : new Date(seconds * 1000).toISOString();
}

export class SACustomerDto {
  @Expose()
  uid!: string;

  @Expose()
  name!: string;

  @Expose()
  phone?: string;

  @Expose()
  email?: string;

  @Expose()
  status!: string;

  @Expose()
  @Transform(({ obj }) => obj.profileData?.state)
  state?: string;

  @Expose()
  @Transform(({ obj }) => obj.profileData?.region)
  region?: string;

  @Expose()
  @Transform(({ obj }) => obj.profileData?.occupation || 'Farmer')
  occupation?: string;

  @Expose()
  totalBookings?: number;

  @Expose()
  totalRevenue?: number;

  @Expose()
  @Transform(({ obj }) => toIsoTimestamp(obj.createdAt))
  createdAt!: string;
}

export class SAResponseDto {
  @Expose()
  uid!: string;

  @Expose()
  name!: string;

  @Expose()
  phone?: string;

  @Expose()
  email?: string;

  @Expose()
  status!: string;

  @Expose()
  @Transform(({ obj }) => obj.businessName || obj.profileData?.businessName)
  businessName?: string;

  @Expose()
  @Transform(({ obj }) => obj.regions || obj.profileData?.regions || [])
  regions!: string[];

  @Expose()
  @Transform(({ obj }) => obj.state || obj.profileData?.state)
  state?: string;

  @Expose()
  @Transform(({ obj }) => obj.documents || obj.verification?.documents || [])
  documents!: Array<{ type: string; url: string; name?: string }>;

  @Expose()
  @Transform(({ obj }) => obj.isVerified !== undefined ? obj.isVerified : (obj.verification?.isVerified || false))
  isVerified!: boolean;

  @Expose()
  totalCustomers?: number;

  @Expose()
  totalBookings?: number;

  @Expose()
  totalRevenue?: number;

  @Expose()
  commissionEarned?: number;

  @Expose()
  @Transform(({ obj }) => toIsoTimestamp(obj.createdAt))
  createdAt!: string;

  @Expose()
  @Transform(({ obj }) => toIsoTimestamp(obj.updatedAt))
  updatedAt!: string;

  @Expose()
  customers?: SACustomerDto[];
}

export class SARequestResponseDto {
  @Expose()
  id!: string;

  @Expose()
  aggregatorId!: string;

  @Expose()
  businessName!: string;

  @Expose()
  contactPerson!: string;

  @Expose()
  phone!: string;

  @Expose()
  email?: string;

  @Expose()
  state?: string;

  @Expose()
  region?: string;

  @Expose()
  status!: string;

  @Expose()
  documents!: Array<{ type: string; url: string; name?: string }>;

  @Expose()
  notes?: string;

  @Expose()
  rejectionReason?: string;

  @Expose()
  approvedBy?: string;

  @Expose()
  @Transform(({ obj }) => toIsoTimestamp(obj.createdAt))
  createdAt!: string;

  @Expose()
  @Transform(({ obj }) => toIsoTimestamp(obj.updatedAt))
  updatedAt!: string;
}

export class PaginatedSAResponseDto {
  @Expose()
  items!: SAResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;

  @Expose()
  totalPages!: number;
}

export class PaginatedSARequestResponseDto {
  @Expose()
  items!: SARequestResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;

  @Expose()
  totalPages!: number;
}
