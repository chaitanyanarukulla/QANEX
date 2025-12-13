import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { Feedback } from './feedback.entity';

const mockRepo: {
  create: jest.Mock;
  save: jest.Mock;
} = {
  create: jest.fn(),
  save: jest.fn(),
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create feedback', async () => {
      const data = {
        message: 'Great app!',
        userId: 'u1',
        tenantId: 't1',
      };
      const feedback = { id: 'f1', ...data };

      mockRepo.create.mockReturnValue(feedback);
      mockRepo.save.mockResolvedValue(feedback);

      const result = await service.create(data);

      expect(result).toEqual(feedback);
      expect(mockRepo.create).toHaveBeenCalledWith(data);
      expect(mockRepo.save).toHaveBeenCalledWith(feedback);
    });

    it('should handle partial data', async () => {
      const data = { message: 'Feedback text' };
      const feedback = { id: 'f1', message: 'Feedback text' };

      mockRepo.create.mockReturnValue(feedback);
      mockRepo.save.mockResolvedValue(feedback);

      const result = await service.create(data);

      expect(result).toEqual(feedback);
    });
  });
});
