import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
    constructor(private readonly flagsService: FeatureFlagsService) { }

    @Get()
    getAll(@Request() req: any) {
        return this.flagsService.getAll(req.user.tenantId);
    }

    @Get(':key')
    async check(@Request() req: any, @Param('key') key: string) {
        const enabled = await this.flagsService.isEnabled(req.user.tenantId, key);
        return { key, enabled };
    }

    // Admin only in real app, but open for now for demo
    @Post()
    setFlag(@Body() body: { key: string; enabled: boolean }, @Request() req: any) {
        return this.flagsService.setFlag(req.user.tenantId, body.key, body.enabled);
    }
}
