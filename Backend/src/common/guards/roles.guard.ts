import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { AppRole } from '../constants/roles.constant';

// Role groups where any member role is treated as equivalent. A user whose
// raw role belongs to a group passes @Roles(...) that lists ANY group member.
// This makes the legacy 'vendor' role and 'fleet_manager' interchangeable so
// fleet managers can call both /fleet/* and /fleet-manager-requests/* endpoints.
const ROLE_GROUPS: Record<string, string[]> = {
  vendor: ['vendor', 'fleet_manager'],
  fleet_manager: ['vendor', 'fleet_manager'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawRole = request.user?.role;
    if (!rawRole) {
      this.logger.warn(`RolesGuard: no role on user ${request.user?.uid}`);
      return false;
    }

    const normalizedRole = String(rawRole).toLowerCase().trim();
    const roleGroup = ROLE_GROUPS[normalizedRole] ?? [normalizedRole];
    const allowed = requiredRoles.map((r) => r.toLowerCase().trim());
    const granted = allowed.some((r) => roleGroup.includes(r));

    if (!granted) {
      this.logger.warn(
        `RolesGuard: DENIED uid=${request.user?.uid} role="${rawRole}" required=[${requiredRoles.join(', ')}]`,
      );
    }

    return granted;
  }
}
