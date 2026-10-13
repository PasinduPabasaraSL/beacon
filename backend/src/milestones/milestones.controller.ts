import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { MilestonesService } from './milestones.service';

@Controller('projects/:projectId/milestones')
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  list(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.milestones.list(projectId);
  }

  @Post()
  @UseGuards(DevAuthGuard)
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestones.create(projectId, user, dto);
  }

  @Patch(':milestoneId')
  @UseGuards(DevAuthGuard)
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestones.update(projectId, milestoneId, user, dto);
  }

  @Delete(':milestoneId')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.milestones.remove(projectId, milestoneId, user);
  }
}
