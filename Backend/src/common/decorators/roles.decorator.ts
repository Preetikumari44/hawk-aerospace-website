import { SetMetadata } from '@nestjs/common';

import type { AppRole } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
