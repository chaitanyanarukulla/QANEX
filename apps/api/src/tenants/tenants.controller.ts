import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant, TenantPlan } from './tenant.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles('ADMIN')
  create(
    @Body() createTenantDto: { name: string; slug: string; plan?: TenantPlan },
  ): Promise<Tenant> {
    return this.tenantsService.create(
      createTenantDto.name,
      createTenantDto.slug,
      createTenantDto.plan,
    );
  }

  @Get()
  @Roles('ADMIN')
  findAll(): Promise<Tenant[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Tenant> {
    const tenant = await this.tenantsService.findOne(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  @Post(':id/settings')
  @Roles('ORG_ADMIN')
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: any,
  ): Promise<Tenant> {
    const tenant = await this.tenantsService.findOne(id);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const updatedSettings = {
      ...tenant.settings,
      ...settings,
    };

    // Profile Enforcement: Ensure Local Provider uses Local Embeddings (Implicitly enforced in Adapter, but explicit in config is good)
    if (updatedSettings.aiConfig?.provider === 'local') {
      // We could force specific embedding config here if we had explicit embedding configuration fields
      // For now, we rely on the adapter logic I just wrote.
      // But let's log it or just ensure we don't have conflicting setup if we expand this later.
    }

    return this.tenantsService.update(id, { settings: updatedSettings });
  }
}
