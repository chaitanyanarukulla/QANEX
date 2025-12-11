import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { DemoService } from './demo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('project')
  async createDemoProject(@Request() req: AuthenticatedRequest) {
    return this.demoService.createDemoProject(req.user.tenantId);
  }
}
