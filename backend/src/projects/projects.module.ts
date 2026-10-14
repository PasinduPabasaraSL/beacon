import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PublicProjectsController } from './public-projects.controller';

@Module({
  controllers: [ProjectsController, PublicProjectsController],
  providers: [ProjectsService, DashboardService],
})
export class ProjectsModule {}
