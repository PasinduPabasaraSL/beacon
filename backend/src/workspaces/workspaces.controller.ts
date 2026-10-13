import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { SemesterService } from './semester.service';

@Controller('workspaces/:workspaceId/semester')
export class WorkspacesController {
  constructor(private readonly semester: SemesterService) {}

  @Get()
  get(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.semester.get(workspaceId);
  }

  @Put()
  @UseGuards(DevAuthGuard)
  update(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.semester.update(workspaceId, user, dto);
  }
}
