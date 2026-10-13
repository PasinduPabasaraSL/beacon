import type { Request } from 'express';
import type { UserSummary } from '../common/user-summary';

export interface AuthenticatedRequest extends Request {
  user: UserSummary;
}
