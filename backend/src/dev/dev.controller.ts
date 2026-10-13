import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { userSummarySelect } from '../common/user-summary';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/** Development-only helpers for the temporary "Acting as" user switcher. */
@Controller('dev')
export class DevController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get('users')
  users() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new NotFoundException();
    }
    return this.prisma.user.findMany({
      select: userSummarySelect,
      orderBy: { createdAt: 'asc' },
    });
  }
}
