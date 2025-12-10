import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TestAutomationSettings,
  AutomationFramework,
} from './test-automation-settings.entity';

@Injectable()
export class TestAutomationSettingsService {
  constructor(
    @InjectRepository(TestAutomationSettings)
    private settingsRepo: Repository<TestAutomationSettings>,
  ) {}

  async getSettings(
    tenantId: string,
    projectId: string,
  ): Promise<TestAutomationSettings> {
    return this.settingsRepo
      .findOne({ where: { tenantId, projectId } })
      .then((res) => res || this.createDefault(tenantId, projectId));
  }

  async updateSettings(
    tenantId: string,
    projectId: string,
    updates: Partial<TestAutomationSettings>,
  ): Promise<TestAutomationSettings> {
    let settings = await this.settingsRepo.findOne({
      where: { tenantId, projectId },
    });
    if (!settings) {
      settings = this.settingsRepo.create({ tenantId, projectId, ...updates });
    } else {
      Object.assign(settings, updates);
    }
    return this.settingsRepo.save(settings);
  }

  private createDefault(
    tenantId: string,
    projectId: string,
  ): TestAutomationSettings {
    return this.settingsRepo.create({
      tenantId,
      projectId,
      framework: AutomationFramework.PLAYWRIGHT,
      enabled: false,
      automationRepoOwner: '',
      automationRepoName: '',
    });
  }
}
