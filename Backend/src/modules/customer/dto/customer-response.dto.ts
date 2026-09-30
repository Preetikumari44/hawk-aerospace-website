import { Expose, Transform } from 'class-transformer';

function toIsoTimestamp(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

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

export class CustomerResponseDto {
  @Expose()
  uid!: string;

  @Expose()
  name!: string;

  @Expose()
  email?: string;

  @Expose()
  phone?: string;

  @Expose()
  role!: string;

  @Expose()
  status!: string;

  @Expose()
  @Transform(({ obj }) => ({
    displayName: obj.profile?.displayName || obj.name,
    firstName: obj.profile?.firstName,
    lastName: obj.profile?.lastName,
    occupation: obj.profileData?.occupation || 'Farmer',
    region: obj.profileData?.region || obj.profile?.region,
    state: obj.profileData?.state || obj.profile?.state,
    location: obj.profileData?.location || obj.profile?.location,
  }))
  profileData!: {
    displayName: string;
    firstName?: string;
    lastName?: string;
    occupation?: string;
    region?: string;
    state?: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  };

  @Expose()
  @Transform(({ obj }) => ({
    isVerified: obj.verification?.isVerified || false,
    documents: obj.verification?.documents || [],
  }))
  verification!: {
    isVerified: boolean;
    documents: Array<{ type: string; url: string }>;
  };

  @Expose()
  @Transform(
    ({ obj }) =>
      toIsoTimestamp(obj.metadata?.createdAt) ??
      toIsoTimestamp(obj.createdAt) ??
      new Date().toISOString(),
  )
  createdAt!: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      toIsoTimestamp(obj.metadata?.updatedAt) ??
      toIsoTimestamp(obj.updatedAt) ??
      new Date().toISOString(),
  )
  updatedAt!: string;

  @Expose()
  totalBookings?: number;

  @Expose()
  totalRevenue?: number;
}