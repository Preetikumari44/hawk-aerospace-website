import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';

@Controller('auth/debug')
export class DebugAuthController {
  @Get('whoami')
  whoAmI(@CurrentUser() user: CurrentUserType) {
    return {
      message: 'Current authenticated user details',
      user: {
        uid: user.uid,
        role: user.role,
        roleType: typeof user.role,
        roleLength: user.role?.length,
        roleCharCodes: user.role ? [...user.role].map(c => c.charCodeAt(0)) : [],
        status: user.status,
        email: user.email,
        phone: user.phone,
        permissions: user.permissions,
      },
      debug: {
        expectedRole: 'super_admin',
        actualRole: user.role,
        rolesMatch: user.role === 'super_admin',
        // Check if role string matches uppercase variant (should not happen if using users collection)
        caseSensitiveMatch: (user.role as string).toUpperCase() === 'SUPER_ADMIN',
      },
    };
  }
}
