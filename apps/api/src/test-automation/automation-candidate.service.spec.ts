import { Test, TestingModule } from '@nestjs/testing';
import { AutomationCandidateService } from './automation-candidate.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AutomationCandidate,
  CandidateStatus,
} from './automation-candidate.entity';
import { TestCase } from '../test-keys/test-case.entity';
import { TestResult, TestResultStatus } from '../test-keys/test-result.entity';

const mockCandidateRepo: {
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
} = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockTestCaseRepo: {
  find: jest.Mock;
  findOne: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
} = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
};

const mockTestResultRepo: {
  find: jest.Mock;
} = {
  find: jest.fn(),
};

describe('AutomationCandidateService', () => {
  let service: AutomationCandidateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationCandidateService,
        {
          provide: getRepositoryToken(AutomationCandidate),
          useValue: mockCandidateRepo,
        },
        { provide: getRepositoryToken(TestCase), useValue: mockTestCaseRepo },
        {
          provide: getRepositoryToken(TestResult),
          useValue: mockTestResultRepo,
        },
      ],
    }).compile();

    service = module.get<AutomationCandidateService>(
      AutomationCandidateService,
    );
    jest.clearAllMocks();
  });

  describe('getAutomationCandidatesWithAI', () => {
    it('should return high scoring candidates', async () => {
      // Setup: 1 test case with high pass rate and high execution count
      const testCase = {
        id: 'tc1',
        title: 'TC1',
        steps: new Array(5).fill({}),
      }; // 5 steps
      mockTestCaseRepo.find.mockResolvedValue([testCase]);

      // Results
      const results = new Array(20).fill({ status: TestResultStatus.PASS }); // 20 passes
      mockTestResultRepo.find.mockResolvedValue(results);
      mockTestCaseRepo.findOne.mockResolvedValue(testCase);

      const candidates = await service.getAutomationCandidatesWithAI(
        't1',
        'p1',
      );

      expect(candidates.length).toBe(1);
      expect(candidates[0].testCaseId).toBe('tc1');
      expect(candidates[0].automationScore).toBeGreaterThanOrEqual(50);
      expect(candidates[0].aiRecommendation).toContain('Excellent');
    });
  });

  describe('createCandidate', () => {
    it('should create candidate and mark test case', async () => {
      const c = { id: 'c1' };
      mockCandidateRepo.create.mockReturnValue(c);
      mockCandidateRepo.save.mockResolvedValue(c);

      await service.createCandidate('t1', 'p1', 'tc1');

      expect(mockCandidateRepo.create).toHaveBeenCalled();
      expect(mockTestCaseRepo.update).toHaveBeenCalledWith('tc1', {
        isAutomationCandidate: true,
      });
    });
  });

  describe('getAutomationCoverage', () => {
    it('should calculate metrics', async () => {
      mockTestCaseRepo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(5); // 10 total, 5 automated
      mockCandidateRepo.find.mockResolvedValue([
        { status: CandidateStatus.MERGED },
        { status: CandidateStatus.PR_OPEN },
      ]);

      const result = await service.getAutomationCoverage('t1', 'p1');

      expect(result.totalTests).toBe(10);
      expect(result.automationRate).toBe(50);
      expect(result.merged).toBe(1);
    });
  });
});
