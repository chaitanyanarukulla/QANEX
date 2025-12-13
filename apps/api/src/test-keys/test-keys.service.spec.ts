/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TestKeysService } from './test-keys.service';
import { TestCase } from './test-case.entity';
import { TestRun, TestRunStatus } from './test-run.entity';
import { TestResult, TestResultStatus } from './test-result.entity';

const mockTestCaseRepo: {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockTestRunRepo: {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockTestResultRepo: {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('TestKeysService', () => {
  let service: TestKeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestKeysService,
        {
          provide: getRepositoryToken(TestCase),
          useValue: mockTestCaseRepo,
        },
        {
          provide: getRepositoryToken(TestRun),
          useValue: mockTestRunRepo,
        },
        {
          provide: getRepositoryToken(TestResult),
          useValue: mockTestResultRepo,
        },
      ],
    }).compile();

    service = module.get<TestKeysService>(TestKeysService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Test Cases', () => {
    describe('createTestCase', () => {
      it('should create test case with tenantId', async () => {
        const data = { title: 'Login Test', description: 'Test user login' };
        const testCase = { id: 'tc1', tenantId: 't1', ...data } as any;

        mockTestCaseRepo.create.mockReturnValue(testCase);
        mockTestCaseRepo.save.mockResolvedValue(testCase);

        const result = await service.createTestCase(data, 't1');

        expect(result).toEqual(testCase);
        expect(mockTestCaseRepo.create).toHaveBeenCalledWith({
          ...data,
          tenantId: 't1',
        });
        expect(mockTestCaseRepo.save).toHaveBeenCalledWith(testCase);
      });
    });

    describe('findAllTestCases', () => {
      it('should find all test cases for tenant', async () => {
        const testCases = [
          { id: 'tc1', title: 'Test 1', tenantId: 't1' },
          { id: 'tc2', title: 'Test 2', tenantId: 't1' },
        ];

        mockTestCaseRepo.find.mockResolvedValue(testCases);

        const result = await service.findAllTestCases('t1');

        expect(result).toEqual(testCases);
        expect(mockTestCaseRepo.find).toHaveBeenCalledWith({
          where: { tenantId: 't1' },
          order: { createdAt: 'DESC' },
        });
      });

      it('should return empty array when no test cases', async () => {
        mockTestCaseRepo.find.mockResolvedValue([]);

        const result = await service.findAllTestCases('t1');

        expect(result).toEqual([]);
      });
    });

    describe('findOneTestCase', () => {
      it('should find test case by id and tenant', async () => {
        const testCase = { id: 'tc1', title: 'Test 1', tenantId: 't1' };

        mockTestCaseRepo.findOne.mockResolvedValue(testCase);

        const result = await service.findOneTestCase('tc1', 't1');

        expect(result).toEqual(testCase);
        expect(mockTestCaseRepo.findOne).toHaveBeenCalledWith({
          where: { id: 'tc1', tenantId: 't1' },
        });
      });

      it('should throw NotFoundException when test case not found', async () => {
        mockTestCaseRepo.findOne.mockResolvedValue(null);

        await expect(service.findOneTestCase('tc1', 't1')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('updateTestCase', () => {
      it('should update test case', async () => {
        const updated = { id: 'tc1', title: 'Updated Test', tenantId: 't1' };
        mockTestCaseRepo.findOne.mockResolvedValue(updated);

        const result = await service.updateTestCase(
          'tc1',
          { title: 'Updated Test' },
          't1',
        );

        expect(result).toEqual(updated);
        expect(mockTestCaseRepo.update).toHaveBeenCalledWith(
          { id: 'tc1', tenantId: 't1' },
          { title: 'Updated Test' },
        );
      });
    });

    describe('deleteTestCase', () => {
      it('should delete test case', async () => {
        await service.deleteTestCase('tc1', 't1');

        expect(mockTestCaseRepo.delete).toHaveBeenCalledWith({
          id: 'tc1',
          tenantId: 't1',
        });
      });
    });
  });

  describe('Test Runs', () => {
    describe('createTestRun', () => {
      it('should create test run', async () => {
        const testRun = {
          id: 'tr1',
          name: 'Run 1',
          tenantId: 't1',
          status: TestRunStatus.PENDING,
        } as any;

        mockTestRunRepo.create.mockReturnValue(testRun);
        mockTestRunRepo.save.mockResolvedValue(testRun);

        const result = await service.createTestRun('Run 1', 't1');

        expect(result).toEqual(testRun);
        expect(mockTestRunRepo.create).toHaveBeenCalledWith({
          name: 'Run 1',
          tenantId: 't1',
          status: TestRunStatus.PENDING,
        });
      });
    });

    describe('findAllTestRuns', () => {
      it('should find all test runs for tenant', async () => {
        const testRuns = [
          {
            id: 'tr1',
            name: 'Run 1',
            tenantId: 't1',
            status: TestRunStatus.COMPLETED,
          },
          {
            id: 'tr2',
            name: 'Run 2',
            tenantId: 't1',
            status: TestRunStatus.PENDING,
          },
        ];

        mockTestRunRepo.find.mockResolvedValue(testRuns);

        const result = await service.findAllTestRuns('t1');

        expect(result).toEqual(testRuns);
        expect(mockTestRunRepo.find).toHaveBeenCalledWith({
          where: { tenantId: 't1' },
          order: { createdAt: 'DESC' },
        });
      });
    });

    describe('findOneTestRun', () => {
      it('should find test run by id and tenant', async () => {
        const testRun = {
          id: 'tr1',
          name: 'Run 1',
          tenantId: 't1',
          status: TestRunStatus.COMPLETED,
        };

        mockTestRunRepo.findOne.mockResolvedValue(testRun);

        const result = await service.findOneTestRun('tr1', 't1');

        expect(result).toEqual(testRun);
        expect(mockTestRunRepo.findOne).toHaveBeenCalledWith({
          where: { id: 'tr1', tenantId: 't1' },
        });
      });

      it('should throw NotFoundException when test run not found', async () => {
        mockTestRunRepo.findOne.mockResolvedValue(null);

        await expect(service.findOneTestRun('tr1', 't1')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('startTestRun', () => {
      it('should update test run status to IN_PROGRESS', async () => {
        const updated = {
          id: 'tr1',
          name: 'Run 1',
          tenantId: 't1',
          status: TestRunStatus.IN_PROGRESS,
        };
        mockTestRunRepo.findOne.mockResolvedValue(updated);

        const result = await service.startTestRun('tr1', 't1');

        expect(result).toEqual(updated);
        expect(mockTestRunRepo.update).toHaveBeenCalledWith(
          { id: 'tr1', tenantId: 't1' },
          { status: TestRunStatus.IN_PROGRESS },
        );
      });
    });

    describe('completeTestRun', () => {
      it('should update test run status to COMPLETED', async () => {
        const updated = {
          id: 'tr1',
          name: 'Run 1',
          tenantId: 't1',
          status: TestRunStatus.COMPLETED,
        };
        mockTestRunRepo.findOne.mockResolvedValue(updated);

        const result = await service.completeTestRun('tr1', 't1');

        expect(result).toEqual(updated);
        expect(mockTestRunRepo.update).toHaveBeenCalledWith(
          { id: 'tr1', tenantId: 't1' },
          { status: TestRunStatus.COMPLETED },
        );
      });
    });
  });

  describe('Test Results & Stats', () => {
    describe('recordResult', () => {
      it('should create new test result', async () => {
        const result = {
          id: 'r1',
          runId: 'tr1',
          caseId: 'tc1',
          status: TestResultStatus.PASS,
          tenantId: 't1',
        } as any;

        mockTestResultRepo.findOne.mockResolvedValue(null);
        mockTestResultRepo.create.mockReturnValue(result);
        mockTestResultRepo.save.mockResolvedValue(result);

        const res = await service.recordResult(
          'tr1',
          'tc1',
          TestResultStatus.PASS,
          't1',
        );

        expect(res).toEqual(result);
        expect(mockTestResultRepo.create).toHaveBeenCalledWith({
          runId: 'tr1',
          caseId: 'tc1',
          status: TestResultStatus.PASS,
          tenantId: 't1',
          notes: undefined,
        });
      });

      it('should update existing test result', async () => {
        const existing = {
          id: 'r1',
          runId: 'tr1',
          caseId: 'tc1',
          status: TestResultStatus.FAIL,
          tenantId: 't1',
        };
        const updated = { ...existing, status: TestResultStatus.PASS };

        mockTestResultRepo.findOne.mockResolvedValue(existing);
        mockTestResultRepo.save.mockResolvedValue(updated);

        const result = await service.recordResult(
          'tr1',
          'tc1',
          TestResultStatus.PASS,
          't1',
        );

        expect(result).toEqual(updated);
        expect(mockTestResultRepo.save).toHaveBeenCalledWith(existing);
      });
    });

    describe('getTestRunStats', () => {
      it('should calculate stats for test run', async () => {
        const results = [
          { status: TestResultStatus.PASS },
          { status: TestResultStatus.PASS },
          { status: TestResultStatus.FAIL },
          { status: TestResultStatus.BLOCKED },
        ] as any[];

        mockTestResultRepo.find.mockResolvedValue(results);

        const stats = await service.getTestRunStats('tr1', 't1');

        expect(stats).toEqual({
          total: 4,
          passed: 2,
          failed: 1,
          blocked: 1,
          skipped: 0,
          passRate: 50,
        });
      });

      it('should return zero stats when no results', async () => {
        mockTestResultRepo.find.mockResolvedValue([]);

        const stats = await service.getTestRunStats('tr1', 't1');

        expect(stats).toEqual({
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          passRate: 0,
        });
      });

      it('should calculate correct pass rate', async () => {
        const results = [
          { status: TestResultStatus.PASS },
          { status: TestResultStatus.PASS },
          { status: TestResultStatus.FAIL },
        ] as any[];

        mockTestResultRepo.find.mockResolvedValue(results);

        const stats = await service.getTestRunStats('tr1', 't1');

        expect(stats.passRate).toBe(67); // 2 passed out of 3 = 66.67, rounded to 67
      });
    });

    describe('getResultsForRun', () => {
      it('should find all results for a test run', async () => {
        const results = [
          { id: 'r1', runId: 'tr1', caseId: 'tc1', tenantId: 't1' },
          { id: 'r2', runId: 'tr1', caseId: 'tc2', tenantId: 't1' },
        ];

        mockTestResultRepo.find.mockResolvedValue(results);

        const res = await service.getResultsForRun('tr1', 't1');

        expect(res).toEqual(results);
        expect(mockTestResultRepo.find).toHaveBeenCalledWith({
          where: { runId: 'tr1', tenantId: 't1' },
          order: { createdAt: 'DESC' },
        });
      });
    });

    describe('getLatestPassRate', () => {
      it('should return latest pass rate', async () => {
        const runs = [{ id: 'tr1', name: 'Run 1', tenantId: 't1' }];
        const results = [
          { status: TestResultStatus.PASS },
          { status: TestResultStatus.FAIL },
        ] as any[];

        mockTestRunRepo.find.mockResolvedValue(runs);
        mockTestResultRepo.find.mockResolvedValue(results);

        const passRate = await service.getLatestPassRate('t1');

        expect(passRate).toBe(50);
      });

      it('should return 0 when no runs exist', async () => {
        mockTestRunRepo.find.mockResolvedValue([]);

        const passRate = await service.getLatestPassRate('t1');

        expect(passRate).toBe(0);
      });
    });
  });
});
