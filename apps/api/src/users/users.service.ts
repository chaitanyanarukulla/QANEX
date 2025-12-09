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
    ) { }

    async create(email: string, firstName: string, lastName: string, tenantId: string, role: OrgRole = OrgRole.VIEWER): Promise<User> {
        // Enforce Plan Limits
        const currentMembers = await this.userTenantRepository.count({ where: { tenantId } });
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
            relations: ['memberships']
        });
    }

    async findAll(tenantId: string): Promise<User[]> {
        return this.usersRepository.find({ where: { tenantId } });
    }

    async findOne(id: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException(`User ${id} not found`);
        }
        return user;
    }
}
