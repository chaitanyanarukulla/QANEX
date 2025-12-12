import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RequirementState } from '../src/requirements/requirement.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Requirement } from '../src/requirements/requirement.entity';
import { SprintItem } from '../src/sprints/sprint-item.entity';
import { Repository } from 'typeorm';

import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import {
  SprintItemType,
  SprintItemPriority,
} from '../src/sprints/sprint-item.entity';

describe('Planning Flow (e2e)', () => {
  let app: INestApplication;
  let reqRepo: Repository<Requirement>;
  let sprintItemRepo: Repository<SprintItem>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { tenantId: 'test-tenant-id', id: 'test-user-id' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    reqRepo = moduleFixture.get(getRepositoryToken(Requirement));
    sprintItemRepo = moduleFixture.get(getRepositoryToken(SprintItem));
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /sprints/backlog/structured - Should return structured backlog', async () => {
    // 1. Setup: Create a BACKLOGGED requirement with a task
    const req = reqRepo.create({
      title: 'Planning E2E Req',
      content: 'Desc',
      state: RequirementState.BACKLOGGED,
      type: 'functional',
      priority: 'high',
      tenantId: 'test-tenant-id',
    });
    const savedReq = await reqRepo.save(req);

    const task1 = sprintItemRepo.create({
      title: 'Task linked to Req',
      status: 'todo',
      type: SprintItemType.IMPLEMENTATION,
      priority: SprintItemPriority.HIGH,
      requirementId: savedReq.id,
      tenantId: 'test-tenant-id',
    });
    await sprintItemRepo.save(task1);

    // 2. Setup: Create a standalone task
    const task2 = sprintItemRepo.create({
      title: 'Standalone Task',
      status: 'todo',
      type: SprintItemType.BUG,
      priority: SprintItemPriority.LOW,
      tenantId: 'test-tenant-id',
    });
    await sprintItemRepo.save(task2);

    // 3. Test Endpoint
    const response = await request(app.getHttpServer())
      .get('/sprints/backlog/structured')
      .expect(200);

    const { requirements, standaloneTasks } = response.body;

    // Verify Requirements
    expect(Array.isArray(requirements)).toBe(true);
    const foundReq = requirements.find((r) => r.id === savedReq.id);
    expect(foundReq).toBeDefined();
    expect(foundReq.tasks).toHaveLength(1);
    expect(foundReq.tasks[0].title).toBe('Task linked to Req');

    // Verify Standalone
    expect(Array.isArray(standaloneTasks)).toBe(true);
    const foundTask = standaloneTasks.find(
      (t) => t.title === 'Standalone Task',
    );
    expect(foundTask).toBeDefined();
  });
});
