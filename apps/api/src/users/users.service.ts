import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { UserTenant, OrgRole } from './user-tenant.entity';
import { PlanLimitsService } from '../billing/plan-limits.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
    private planLimitsService: PlanLimitsService,
  ) {}

  async create(
    email: string,
    firstName: string,
    lastName: string,
    tenantId: string,
    role: OrgRole = OrgRole.VIEWER,
  ): Promise<User> {
    // Enforce Plan Limits
    const currentMembers = await this.userTenantRepository.count({
      where: { tenantId },
    });
    await this.planLimitsService.assertCanAddUser(tenantId, currentMembers);

    // Create User
    let user = await this.findByEmail(email);
    if (!user) {
      user = this.usersRepository.create({
        email,
        firstName,
        lastName,
        tenantId, // Default/Home Tenant
        role: UserRole.MEMBER, // Legacy
        passwordHash: 'mock-hash',
      });
      user = await this.usersRepository.save(user);
    }

    // Create Membership
    const membership = this.userTenantRepository.create({
      userId: user.id,
      tenantId,
      role,
    });
    await this.userTenantRepository.save(membership);

    return this.findByEmail(email) as Promise<User>; // Reload with relations
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['memberships'],
    });
  }

  async findAll(tenantId: string): Promise<any[]> {
    const memberships = await this.userTenantRepository.find({
      where: { tenantId },
      relations: ['user'],
    });

    return memberships.map((m) => ({
      id: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async updateRole(
    userId: string,
    tenantId: string,
    role: OrgRole,
  ): Promise<UserTenant> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this tenant');
    }

    membership.role = role;
    return this.userTenantRepository.save(membership);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async removeMember(userId: string, tenantId: string): Promise<void> {
    const membership = await this.userTenantRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this tenant');
    }

    await this.userTenantRepository.remove(membership);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }
}
