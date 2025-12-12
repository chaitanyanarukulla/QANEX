import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { Requirement } from '../requirements/requirement.entity';
import { Bug } from '../bugs/bug.entity';

const mockRequirementRepo = {
  find: jest.fn(),
};

const mockBugRepo = {
  find: jest.fn(),
};

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getRepositoryToken(Requirement),
          useValue: mockRequirementRepo,
        },
        {
          provide: getRepositoryToken(Bug),
          useValue: mockBugRepo,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportAllJson', () => {
    it('should export all data for tenant', async () => {
      const requirements = [
        { id: 'r1', title: 'Req 1', tenantId: 't1' },
        { id: 'r2', title: 'Req 2', tenantId: 't1' },
      ];
      const bugs = [{ id: 'b1', title: 'Bug 1', tenantId: 't1' }];

      mockRequirementRepo.find.mockResolvedValue(requirements);
      mockBugRepo.find.mockResolvedValue(bugs);

      const result = await service.exportAllJson('t1');

      expect(result).toHaveProperty('tenantId', 't1');
      expect(result).toHaveProperty('exportedAt');
      expect(result.requirements).toEqual(requirements);
      expect(result.bugs).toEqual(bugs);
      expect(mockRequirementRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
      });
      expect(mockBugRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
      });
    });

    it('should export empty data when no requirements or bugs', async () => {
      mockRequirementRepo.find.mockResolvedValue([]);
      mockBugRepo.find.mockResolvedValue([]);

      const result = await service.exportAllJson('t1');

      expect(result.requirements).toEqual([]);
      expect(result.bugs).toEqual([]);
    });

    it('should set exportedAt to current date', async () => {
      mockRequirementRepo.find.mockResolvedValue([]);
      mockBugRepo.find.mockResolvedValue([]);

      const before = new Date();
      const result = await service.exportAllJson('t1');
      const after = new Date();

      expect(result.exportedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result.exportedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
