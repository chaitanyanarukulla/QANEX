import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  Get,
  Delete,
  Param,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { Throttle } from '@nestjs/throttler';
import { RequirementsService } from '../requirements/requirements.service';
import { BugsService } from '../bugs/bugs.service';

import { AgenticRagService } from './agentic-rag.service';

interface UserPayload {
  tenantId: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard, AiRateLimitGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class RagController {
  constructor(
    private readonly ragService: RagService,
    private readonly agenticRagService: AgenticRagService,
    @Inject(forwardRef(() => RequirementsService))
    private readonly requirementsService: RequirementsService,
    @Inject(forwardRef(() => BugsService))
    private readonly bugsService: BugsService,
  ) {}

  @Post('reindex')
  async reindex(@Request() req: any) {
    const tenantId = (req.user as UserPayload)?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    // optimizing: could be parallel or batched
    const requirements = await this.requirementsService.findAll(tenantId);
    const bugs = await this.bugsService.findAll(tenantId);

    let reqCount = 0;
    for (const req of requirements) {
      await this.ragService.indexRequirement(
        req.id,
        tenantId,
        req.title,
        req.content,
      );
      reqCount++;
    }

    let bugCount = 0;
    for (const bug of bugs) {
      await this.ragService.indexBug(
        bug.id,
        tenantId,
        bug.title,
        bug.description || '',
      );
      bugCount++;
    }

    return {
      status: 'completed',
      indexed: {
        requirements: reqCount,
        bugs: bugCount,
        total: reqCount + bugCount,
      },
    };
  }

  @Post('search')
  async search(
    @Body() body: { query: string; mode?: 'simple' | 'agentic' },
    @Request() req: any,
  ) {
    const tenantId = (req.user as UserPayload)?.tenantId;
    if (!tenantId) throw new ForbiddenException();

    if (body.mode === 'agentic') {
      const answer = await this.agenticRagService.answer(body.query, tenantId);
      // Provide a structure that matches what frontend might expect or a new structure
      // Since frontend expects SearchResult[], we might need to adapt.
      // But 'answer' returns a string (the synthesized answer).
      // If the frontend 'search' is purely for documents, then we should keep it that way.
      // If this is for "AI Chat", we should probably separate it or wrap it.
      // The implementation plan said: "Update POST /ai/search to accept optional mode... Default to agentic".
      // BUT, standard search usually returns documents. Agentic RAG returns an ANSWER.
      // Let's return a special structure or if the frontend expects documents, we return the docs FOUND by the agent?
      // AgenticRagService.answer returns string.
      // Let's modify the return type to be dynamic or add a new endpoint if strictly different.
      // Implementation plan said "Update POST /ai/search".
      // If I change return type, I break frontend potentially.
      // Let's make a new endpoint `POST /ai/ask` or have search return a wrapped result.
      // Given 'search' is used for listing results in the UI (Search bar), maybe I should fetch the documents found by the agent?
      // OR, maybe the user wants an ANSWER.
      // The prompt "Implement Agentic RAG (Chain of Thought)" implies answering.
      // Let's return the answer as a special "SearchResult" of type "ANSWER" or simply change the endpoint to return { answer: string, sources: ... }
      // BUT `aiApi.search` returns `SearchResult[]`.
      return [
        {
          id: 'agent-answer',
          type: 'ANSWER',
          content: answer,
          metadata: { title: 'AI Generated Answer' },
        },
      ];
    }

    // Default Simple Search
    const results = await this.ragService.search(body.query, tenantId);
    return results.map((r) => ({
      id: r.id,
      type: r.type,
      content: r.content,
      metadata: r.metadata,
    }));
  }

  @Post('index/test')
  async testIndex(@Body() body: { content: string }, @Request() req: any) {
    // Manual trigger for testing
    const tenantId = (req.user as UserPayload)?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }
    await this.ragService.indexItem({
      id: Date.now().toString(),
      tenantId,
      type: 'REQUIREMENT',
      content: body.content,
      metadata: { title: 'Test Item' },
    });
    return { status: 'indexed' };
  }
  @Get('documents')
  async listDocuments(@Request() req: any) {
    const tenantId = (req.user as UserPayload)?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }
    return this.ragService.list(tenantId);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string, @Request() req: any) {
    const tenantId = (req.user as UserPayload)?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }
    await this.ragService.delete(id, tenantId);
    return { status: 'deleted', id };
  }
}
