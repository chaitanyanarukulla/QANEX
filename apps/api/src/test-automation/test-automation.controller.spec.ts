import { Test, TestingModule } from '@nestjs/testing';
import { TestAutomationController } from './test-automation.controller';
import { TestAutomationService } from './test-automation.service';
import { AutomationCandidateService } from './automation-candidate.service';

const mockAutomationService: {
  generatePr: jest.Mock;
} = {
  generatePr: jest.fn(),
};

const mockCandidateService: {
  getCandidates: jest.Mock;
  getAutomationCandidatesWithAI: jest.Mock;
  getAutomationCoverage: jest.Mock;
  createCandidate: jest.Mock;
} = {
  getCandidates: jest.fn(),
  getAutomationCandidatesWithAI: jest.fn(),
  getAutomationCoverage: jest.fn(),
  createCandidate: jest.fn(),
};

const mockReq = {
  user: {
    userId: 'u1',
    tenantId: 't1',
  },
} as any;

describe('TestAutomationController', () => {
  let controller: TestAutomationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestAutomationController],
      providers: [
        { provide: TestAutomationService, useValue: mockAutomationService },
        { provide: AutomationCandidateService, useValue: mockCandidateService },
      ],
    }).compile();

    controller = module.get<TestAutomationController>(TestAutomationController);
    jest.clearAllMocks();
  });

  describe('getCandidates', () => {
    it('should return candidates', async () => {
      mockCandidateService.getCandidates.mockResolvedValue([]);
      await controller.getCandidates(mockReq);
      expect(mockCandidateService.getCandidates).toHaveBeenCalledWith(
        't1',
        'default-project',
      );
    });
  });

  describe('getAISuggestions', () => {
    it('should return suggestions', async () => {
      mockCandidateService.getAutomationCandidatesWithAI.mockResolvedValue([]);
      await controller.getAISuggestions(mockReq, '5');
      expect(
        mockCandidateService.getAutomationCandidatesWithAI,
      ).toHaveBeenCalledWith('t1', 'default-project', 5);
    });
  });

  describe('getCoverage', () => {
    it('should return coverage', async () => {
      mockCandidateService.getAutomationCoverage.mockResolvedValue({});
      await controller.getCoverage(mockReq);
      expect(mockCandidateService.getAutomationCoverage).toHaveBeenCalled();
    });
  });

  describe('createCandidate', () => {
    it('should create candidate', async () => {
      mockCandidateService.createCandidate.mockResolvedValue({});
      await controller.createCandidate(mockReq, { testCaseId: 'tv1' });
      expect(mockCandidateService.createCandidate).toHaveBeenCalledWith(
        't1',
        'default-project',
        'tv1',
        undefined,
      );
    });
  });

  describe('generatePr', () => {
    it('should generate PR', async () => {
      mockAutomationService.generatePr.mockResolvedValue({});
      await controller.generatePr(mockReq, 'c1');
      expect(mockAutomationService.generatePr).toHaveBeenCalledWith(
        't1',
        'default-project',
        'c1',
      );
    });
  });
});
