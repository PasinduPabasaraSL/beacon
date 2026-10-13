import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { BoardQueryDto } from './dto/board-query.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly dashboard: DashboardService,
  ) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Get(':projectId')
  get(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projects.get(projectId);
  }

  @Get(':projectId/board')
  board(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: BoardQueryDto,
  ) {
    return this.projects.board(projectId, query.sprintId);
  }

  @Get(':projectId/dashboard')
  getDashboard(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.dashboard.get(projectId);
  }
}
