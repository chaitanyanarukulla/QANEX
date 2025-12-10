import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { OrgRole } from '../users/user-tenant.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) { }

  async validateUser(email: string, _sub: string): Promise<any> {
    return this.usersService.findByEmail(email);
  }

  async login(userDto: { email: string; sub: string; name?: string }) {
    let user = await this.usersService.findByEmail(userDto.email);

    // Auto-provisioning flow (Phase 6.2)
    if (!user) {
      // Logic: Create a new Tenant for this user
      // In real app, we might ask user for Org Name. Here we derive from email domain or name.
      let orgName = 'My Organization';
      let slug = 'my-org-' + Date.now();

      if (userDto.name) {
        orgName = userDto.name + "'s Org";
        slug =
          userDto.name.toLowerCase().replace(/\s+/g, '-') +
          '-' +
          Date.now().toString().slice(-4);
      }

      const tenant = await this.tenantsService.create(orgName, slug);

      // Create Admin User linked to this Tenant
      const [firstName, lastName] = (userDto.name || 'Admin User').split(' ');
      user = await this.usersService.create(
        userDto.email,
        firstName || 'Admin',
        lastName || 'User',
        tenant.id, // Default home tenant
        OrgRole.ORG_ADMIN,
      );
    }

    const payload = {
      email: user.email,
      sub: user.id || userDto.sub,
      // We don't put tenantId here because it's dynamic based on header,
      // BUT we can put default tenantId.
      tid: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        defaultTenantId: user.tenantId,
      },
    };
  }
}
