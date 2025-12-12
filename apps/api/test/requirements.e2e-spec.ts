/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { CreateRequirementDto } from '../src/requirements/dto/create-requirement.dto';
import { RequirementState } from '../src/requirements/requirement.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SprintItem } from '../src/sprints/sprint-item.entity';

import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import {
  SprintItemType,
  SprintItemPriority,
  SprintItemStatus,
} from '../src/sprints/sprint-item.entity';
import { RagService } from '../src/ai/rag.service';
import { AiProviderFactory } from '../src/ai/providers';

describe('Requirements Flow (e2e)', () => {
  let app: INestApplication;
  let createdReqId: string;
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
      .overrideProvider(RagService)
      .useValue({
        indexRequirement: jest.fn().mockResolvedValue(true),
        removeRequirement: jest.fn().mockResolvedValue(true),
      })
      .overrideProvider(AiProviderFactory)
      .useValue({
        getProvider: jest.fn().mockResolvedValue({
          provider: {
            chat: jest.fn().mockResolvedValue({ content: '{"tasks": []}' }),
            analyzeRequirement: jest.fn().mockResolvedValue({ score: 100 }),
          },
          config: { model: 'gpt-4' },
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    sprintItemRepo = moduleFixture.get<Repository<SprintItem>>(
      getRepositoryToken(SprintItem),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/requirements (POST) - Create Requirement', async () => {
    const createDto: CreateRequirementDto = {
      title: 'E2E Test Requirement',
      content: 'Testing the full flow',
      priority: 'HIGH',
      type: 'FUNCTIONAL',
    };

    const response = await request(app.getHttpServer())
      .post('/requirements')
      .send(createDto)
      .expect(201);

    createdReqId = response.body.id;
    expect(response.body.title).toBe(createDto.title);
    expect(response.body.state).toBe(RequirementState.DRAFT);
  });

  it('/requirements/:id (PATCH) - Approve Requirement', async () => {
    // First setup: Add mock tasks manually since generate-tasks uses AI
    // We'll create a task linked to this requirement directly in DB or via sprint item API if available
    // For this e2e, let's use the API or repo if we need tasks for the next step.

    // Actually, let's approve it first.
    // Assuming there is an endpoint to update status or we just use PATCH
    const response = await request(app.getHttpServer())
      .patch(`/requirements/${createdReqId}`)
      .send({ state: RequirementState.APPROVED })
      .expect(200);

    expect(response.body.state).toBe(RequirementState.APPROVED);
  });

  it('Should generate tasks (Mocked by creating manually)', async () => {
    // We manually create a task associated with this requirement
    // simulating the "Generate Tasks" outcome
    const task = sprintItemRepo.create({
      title: 'Test Implementation Task',
      description: 'Implement the thing',
      status: SprintItemStatus.TODO,
      priority: SprintItemPriority.MEDIUM,
      type: SprintItemType.TASK,
      requirementId: createdReqId,
      tenantId: 'test-tenant-id',
      // sprintId is null initially
    });
    await sprintItemRepo.save(task);
  });

  it('/requirements/:id/move-tasks-backlog (POST) - Move to Backlog', async () => {
    const response = await request(app.getHttpServer())
      .post(`/requirements/${createdReqId}/move-tasks-backlog`)
      .expect(201);

    // Verify requirement state
    expect(response.body.success).toBe(true);

    // Verify requirement is now BACKLOGGED
    const fetchResponse = await request(app.getHttpServer())
      .get(`/requirements/${createdReqId}`)
      .expect(200);

    expect(fetchResponse.body.state).toBe(RequirementState.BACKLOGGED);
  });
});
