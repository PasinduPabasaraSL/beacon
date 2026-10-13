import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, DashboardService],
})
export class ProjectsModule {}
