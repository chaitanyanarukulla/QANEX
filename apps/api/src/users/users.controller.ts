import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { OrgRole } from './user-tenant.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Request() req: any): Promise<any[]> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.usersService.findAll(tenantId);
  }

  @Post()
  @Roles('ORG_ADMIN')
  create(
    @Body()
    dto: { email: string; firstName: string; lastName: string; role?: OrgRole },
    @Request() req: any,
  ): Promise<User> {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.usersService.create(
      dto.email,
      dto.firstName,
      dto.lastName,
      tenantId,
      dto.role,
    );
  }

  @Patch(':id/role')
  @Roles('ORG_ADMIN')
  updateRole(
    @Param('id') userId: string,
    @Body('role') role: OrgRole,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.usersService.updateRole(userId, tenantId, role);
  }

  @Delete(':id')
  @Roles('ORG_ADMIN')
  removeMember(@Param('id') userId: string, @Request() req: any) {
    const tenantId = req.user.tenantId || 'mock-tenant-id';
    return this.usersService.removeMember(userId, tenantId);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN')
  update(@Param('id') userId: string, @Body() dto: Partial<User>) {
    return this.usersService.update(userId, dto);
  }
}
