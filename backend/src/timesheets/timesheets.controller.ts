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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import { parseDay } from '../common/week';
import {
  CreateRowDto,
  LogTimeDto,
  ReviewTimesheetDto,
  SetDayDto,
  TimesheetQueryDto,
  UpdateRowDto,
  WeekDto,
} from './dto/timesheet.dto';
import { TimesheetsService } from './timesheets.service';

@Controller('projects/:projectId/timesheets')
export class TimesheetsController {
  constructor(private readonly timesheets: TimesheetsService) {}

  /** Every member's timesheet for one week. */
  @Get()
  week(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: TimesheetQueryDto,
  ) {
    return this.timesheets.week(
      projectId,
      query.week ? parseDay(query.week) : new Date(),
    );
  }

  @Post('rows')
  @UseGuards(DevAuthGuard)
  addRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: CreateRowDto,
  ) {
    return this.timesheets.addRow(projectId, user, dto);
  }

  @Patch('rows/:rowId')
  @UseGuards(DevAuthGuard)
  updateRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateRowDto,
  ) {
    return this.timesheets.updateRow(projectId, rowId, user, dto);
  }

  @Delete('rows/:rowId')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRow(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.timesheets.removeRow(projectId, rowId, user);
  }

  /** Sets a day's hours and note; zero hours without a note clears the day. */
  @Put('rows/:rowId/days/:date')
  @UseGuards(DevAuthGuard)
  setDay(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Param('date') date: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: SetDayDto,
  ) {
    return this.timesheets.setDay(projectId, rowId, date, user, dto);
  }

  @Post('log')
  @UseGuards(DevAuthGuard)
  logTime(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: LogTimeDto,
  ) {
    return this.timesheets.logTime(projectId, user, dto);
  }

  @Post('submit')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.OK)
  submit(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: WeekDto,
  ) {
    return this.timesheets.submit(projectId, user, dto.week);
  }

  @Post('recall')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.OK)
  recall(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: WeekDto,
  ) {
    return this.timesheets.recall(projectId, user, dto.week);
  }

  @Post(':timesheetId/review')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.OK)
  review(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('timesheetId', ParseUUIDPipe) timesheetId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: ReviewTimesheetDto,
  ) {
    return this.timesheets.review(projectId, timesheetId, user, dto);
  }
}
