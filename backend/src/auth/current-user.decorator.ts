import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserSummary } from '../common/user-summary';
import type { AuthenticatedRequest } from './authenticated-request';

/** The user resolved by the auth guard. Only valid on guarded routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserSummary =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
