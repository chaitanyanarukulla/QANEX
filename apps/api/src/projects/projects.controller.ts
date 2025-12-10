import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.projectsService.create({
      ...body,
      tenantId: req.user.tenantId,
    });
  }
}
