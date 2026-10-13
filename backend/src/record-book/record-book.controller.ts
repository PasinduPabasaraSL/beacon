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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import {
  CreateMeetingDto,
  ReviewMeetingDto,
  SignRecordBookDto,
  UpdateMeetingDto,
  UpdateRecordBookDetailsDto,
} from './dto/record-book.dto';
import { RecordBookService } from './record-book.service';

@Controller('projects/:projectId')
export class RecordBookController {
  constructor(private readonly recordBook: RecordBookService) {}

  @Get('record-book')
  get(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.recordBook.get(projectId);
  }

  @Put('record-book/details')
  @UseGuards(DevAuthGuard)
  updateDetails(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateRecordBookDetailsDto,
  ) {
    return this.recordBook.updateDetails(projectId, user, dto);
  }

  @Post('record-book/sign')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.OK)
  sign(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: SignRecordBookDto,
  ) {
    return this.recordBook.sign(projectId, user, dto);
  }

  @Post('meetings')
  @UseGuards(DevAuthGuard)
  createMeeting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.recordBook.createMeeting(projectId, user, dto);
  }

  @Patch('meetings/:meetingId')
  @UseGuards(DevAuthGuard)
  updateMeeting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.recordBook.updateMeeting(projectId, meetingId, user, dto);
  }

  @Delete('meetings/:meetingId')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMeeting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.recordBook.removeMeeting(projectId, meetingId, user);
  }

  @Post('meetings/:meetingId/review')
  @UseGuards(DevAuthGuard)
  @HttpCode(HttpStatus.OK)
  reviewMeeting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: ReviewMeetingDto,
  ) {
    return this.recordBook.reviewMeeting(projectId, meetingId, user, dto);
  }
}
