import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class RagController {
    constructor(private readonly ragService: RagService) { }

    @Post('search')
    async search(@Body() body: { query: string }, @Request() req: any) {
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        return this.ragService.search(body.query, tenantId);
    }

    @Post('index/test')
    async testIndex(@Body() body: { content: string }, @Request() req: any) {
        // Manual trigger for testing
        const tenantId = req.user.tenantId || 'mock-tenant-id';
        await this.ragService.indexItem({
            id: Date.now().toString(),
            tenantId,
            type: 'REQUIREMENT',
            content: body.content,
            metadata: { title: 'Test Item' }
        });
        return { status: 'indexed' };
    }
}
