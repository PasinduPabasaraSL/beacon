import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import type { UserSummary } from '../common/user-summary';
import { ApproveEntriesDto } from './dto/approve-entries.dto';
import { SaveSignatureDto } from './dto/save-signature.dto';
import { MeService } from './me.service';

@Controller('me')
@UseGuards(DevAuthGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  profile(@CurrentUser() user: UserSummary) {
    return this.me.profile(user);
  }

  @Get('week')
  week(@CurrentUser() user: UserSummary) {
    return this.me.week(user);
  }

  @Get('reviews')
  reviews(@CurrentUser() user: UserSummary) {
    return this.me.reviewQueue(user);
  }

  @Post('reviews/approve')
  @HttpCode(HttpStatus.OK)
  approve(@CurrentUser() user: UserSummary, @Body() dto: ApproveEntriesDto) {
    return this.me.approve(user, dto.entryIds);
  }

  /** `null` until the user saves one. */
  @Get('signature')
  async signature(@CurrentUser() user: UserSummary) {
    return { signature: await this.me.getSignature(user) };
  }

  @Put('signature')
  async saveSignature(
    @CurrentUser() user: UserSummary,
    @Body() dto: SaveSignatureDto,
  ) {
    return { signature: await this.me.saveSignature(user, dto) };
  }

  @Delete('signature')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSignature(@CurrentUser() user: UserSummary) {
    return this.me.deleteSignature(user);
  }
}
