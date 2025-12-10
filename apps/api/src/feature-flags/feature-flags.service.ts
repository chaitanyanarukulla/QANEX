import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './feature-flag.entity';

@Injectable()
export class FeatureFlagsService {
  constructor(
    @InjectRepository(FeatureFlag)
    private flagRepo: Repository<FeatureFlag>,
  ) {}

  async isEnabled(tenantId: string, key: string): Promise<boolean> {
    const flag = await this.flagRepo.findOne({ where: { tenantId, key } });
    return flag ? flag.enabled : false; // Default to false if not set
  }

  async setFlag(tenantId: string, key: string, enabled: boolean) {
    let flag = await this.flagRepo.findOne({ where: { tenantId, key } });
    if (flag) {
      flag.enabled = enabled;
    } else {
      flag = this.flagRepo.create({ tenantId, key, enabled });
    }
    return this.flagRepo.save(flag);
  }

  async getAll(tenantId: string) {
    return this.flagRepo.find({ where: { tenantId } });
  }
}
