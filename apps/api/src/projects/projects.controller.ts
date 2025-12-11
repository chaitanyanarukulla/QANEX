import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.projectsService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Body() body: any, @Request() req: AuthenticatedRequest) {
    return this.projectsService.create({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const project = await this.projectsService.findOne(id, req.user.tenantId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
