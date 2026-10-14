import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import { DashboardService } from './dashboard.service';
import { BoardQueryDto } from './dto/board-query.dto';
import { UpdateProjectProfileDto } from './dto/update-profile.dto';
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

  @Patch(':projectId/profile')
  @UseGuards(DevAuthGuard)
  updateProfile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateProjectProfileDto,
  ) {
    return this.projects.updateProfile(projectId, user, dto);
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
