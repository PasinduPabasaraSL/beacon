import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { userSummarySelect } from '../common/user-summary';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './authenticated-request';

export const DEV_USER_HEADER = 'x-dev-user-id';

/**
 * Temporary stand-in for GitHub sign-in: trusts the user id sent in the
 * `X-Dev-User-Id` header. Always rejects requests in production.
 */
@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new UnauthorizedException('Sign-in is not available yet');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.header(DEV_USER_HEADER);
    if (!userId || !isUUID(userId)) {
      throw new UnauthorizedException(
        'Choose a user in the "Acting as" menu first',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSummarySelect,
    });
    if (!user) {
      throw new UnauthorizedException('Unknown user');
    }

    request.user = user;
    return true;
  }
}
