import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';

/** Open to anyone, signed in or not. */
@Controller('public/projects')
export class PublicProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get(':projectId')
  get(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projects.publicProfile(projectId);
  }
}
