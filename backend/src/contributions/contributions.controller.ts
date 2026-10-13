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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import { ContributionsService } from './contributions.service';
import {
  CreateContributionDto,
  ReviewContributionDto,
  UpdateContributionDto,
} from './dto/contribution-entry.dto';
import { ContributionsQueryDto } from './dto/contributions-query.dto';

@Controller('projects/:projectId/contributions')
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Get()
  list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ContributionsQueryDto,
  ) {
    const week = query.week ? new Date(`${query.week}T00:00:00Z`) : new Date();
    return this.contributions.listForWeek(projectId, week);
  }

  @Post()
  @UseGuards(DevAuthGuard)
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: CreateContributionDto,
  ) {
    return this.contributions.create(projectId, user, dto);
  }

  @Patch(':entryId')
  @UseGuards(DevAuthGuard)
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateContributionDto,
  ) {
    return this.contributions.update(projectId, entryId, user, dto);
  }

  @Delete(':entryId')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.contributions.remove(projectId, entryId, user);
  }

  @Post(':entryId/review')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.OK)
  review(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: ReviewContributionDto,
  ) {
    return this.contributions.review(projectId, entryId, user, dto);
  }
}
