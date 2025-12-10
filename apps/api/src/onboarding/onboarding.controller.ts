import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('checklist')
  async getChecklist(@Request() req: any) {
    return this.onboardingService.getChecklist(req.user.tenantId);
  }
}
