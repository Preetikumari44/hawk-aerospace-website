import type { AppRole, UserStatus } from '../constants/roles.constant';

export interface JwtPayload {
  uid: string;
  role: AppRole;
  status: UserStatus;
  phone?: string | null;
  email?: string | null;
  permissions?: Record<string, boolean>;
}
