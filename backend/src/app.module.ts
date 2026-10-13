import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { DevModule } from './dev/dev.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { MilestonesModule } from './milestones/milestones.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { RecordBookModule } from './record-book/record-book.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    ProjectsModule,
    TimesheetsModule,
    MilestonesModule,
    RecordBookModule,
    WorkspacesModule,
    MeModule,
    DevModule,
  ],
})
export class AppModule {}
