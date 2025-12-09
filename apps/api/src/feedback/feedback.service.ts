import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './feedback.entity';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectRepository(Feedback)
        private feedbackRepo: Repository<Feedback>,
    ) { }

    async create(data: Partial<Feedback>): Promise<Feedback> {
        return this.feedbackRepo.save(this.feedbackRepo.create(data));
    }
}
