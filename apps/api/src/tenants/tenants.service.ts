import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantPlan } from './tenant.entity';

@Injectable()
export class TenantsService {
    constructor(
        @InjectRepository(Tenant)
        private tenantsRepository: Repository<Tenant>,
    ) { }

    create(name: string, slug: string, plan: TenantPlan = TenantPlan.STARTER): Promise<Tenant> {
        const tenant = this.tenantsRepository.create({ name, slug, plan });
        return this.tenantsRepository.save(tenant);
    }

    findAll(): Promise<Tenant[]> {
        return this.tenantsRepository.find();
    }

    findOne(id: string): Promise<Tenant | null> {
        return this.tenantsRepository.findOneBy({ id });
    }

    async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
        await this.tenantsRepository.update(id, data);
        const tenant = await this.findOne(id);
        if (!tenant) throw new Error('Tenant not found');
        return tenant;
    }

    findBySlug(slug: string): Promise<Tenant | null> {
        return this.tenantsRepository.findOneBy({ slug });
    }
}
