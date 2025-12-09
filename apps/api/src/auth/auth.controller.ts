import { Controller, Post, Body, Get, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: { email: string; sub: string; name?: string }) {
        // In real OIDC, this receives the ID Token or Code, validates it, then issues our JWT.
        // For Phase 6.2 dev, we accept email/sub to simulate OIDC callback.
        return this.authService.login(body);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
