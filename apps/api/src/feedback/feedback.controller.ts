import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    @Post()
    create(@Body() body: any, @Request() req: any) {
        return this.feedbackService.create({
            ...body,
            tenantId: req.user.tenantId,
            userId: req.user.userId
        });
    }
}
