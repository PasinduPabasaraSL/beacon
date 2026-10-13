import { Module } from '@nestjs/common';
import { SemesterService } from './semester.service';
import { WorkspacesController } from './workspaces.controller';

@Module({
  controllers: [WorkspacesController],
  providers: [SemesterService],
})
export class WorkspacesModule {}
