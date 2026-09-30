import type { Request } from 'express';

import type { CurrentUser } from './current-user.interface';

export interface AuthenticatedRequest extends Request {
  user: CurrentUser;
}
