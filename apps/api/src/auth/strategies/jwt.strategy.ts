import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: true, // For mock purposes
            secretOrKey: 'MOCK_SECRET',
            passReqToCallback: true, // Needed to access request headers for tenantId
        });
    }

    async validate(req: any, payload: any) {
        // Mock token fallback
        if (payload.sub === 'mock-user-id') {
            return {
                userId: 'mock-user-id',
                email: 'mock@example.com',
                roles: ['ORG_ADMIN'], // Mock as admin
                tenantId: req.tenantId || 'mock-tenant-id'
            };
        }

        const user = await this.usersService.findByEmail(payload.email);
        if (!user) {
            // Auto-provisioning logic could go here or return null
            throw new UnauthorizedException();
        }

        const tenantId = req.tenantId || user.tenantId; // Use header tenant or default
        let roles = ['VIEWER']; // Default role

        if (tenantId) {
            // Find role in this tenant
            // Need a method in UsersService to find membership: user.memberships.find(m => m.tenantId === tenantId)
            // For efficiency, we should join memberships in findByEmail or separate query.
            const membership = user.memberships?.find(m => m.tenantId === tenantId);

            // If membership loaded (we need to ensure findByEmail loads it), use it.
            if (membership) {
                roles = [membership.role];
            } else if (user.tenantId === tenantId) {
                // Fallback to legacy role if matching default tenant
                // roles = [user.role]; // Legacy
            }
        }

        return {
            userId: user.id,
            email: user.email,
            roles: roles,
            tenantId: tenantId
        };
    }
}
