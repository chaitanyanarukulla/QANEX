import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentAIReview } from './entities/document-ai-review.entity';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';
import { RagService } from '../ai/rag.service';
import { RequirementsService } from '../requirements/requirements.service';
import { RequirementState } from '../requirements/requirement.entity';

@Injectable()
export class DocumentsAiService {
  private readonly logger = new Logger(DocumentsAiService.name);

  constructor(
    @InjectRepository(DocumentAIReview)
    private reviewRepo: Repository<DocumentAIReview>,
    private aiProviderFactory: AiProviderFactory,
    private ragService: RagService,
    private requirementsService: RequirementsService,
  ) {}

  async analyzeDocument(
    document: Document,
    tenantId: string,
  ): Promise<DocumentAIReview> {
    this.logger.log(`Analyzing document ${document.id} for tenant ${tenantId}`);

    const { provider, config } =
      await this.aiProviderFactory.getProvider(tenantId);

    const prompt = `
      You are an expert QA and Requirements Analyst.
      Analyze the following document and provide a structured review.
      
      Document Title: ${document.title}
      Content:
      ${document.content}

      Output JSON format:
      {
        "score": number (0-100),
        "summary": "Brief summary of quality and coverage",
        "risks": [
          { "risk": "Title", "severity": "LOW"|"MEDIUM"|"HIGH", "mitigation": "Suggestion" }
        ],
        "gaps": [
          { "gap": "Description", "suggestion": "What to add" }
        ],
        "requirements": [
          { "title": "Requirement Title", "description": "Detailed description" }
        ]
      }
    `;

    try {
      const response = await provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: config.model,
          temperature: 0.1,
          responseFormat: 'json',
        },
        config.apiKey,
      );

      const result = JSON.parse(response.content);

      // Create or update review
      let review = await this.reviewRepo.findOne({
        where: { documentId: document.id },
      });
      if (!review) {
        review = this.reviewRepo.create({ documentId: document.id });
      }

      review.score = result.score;
      review.summary = result.summary;
      review.risks = result.risks;
      review.gaps = result.gaps;

      await this.reviewRepo.save(review);

      // Sync Requirements
      if (result.requirements && Array.isArray(result.requirements)) {
        for (const req of result.requirements) {
          // Check if exists (fuzzy match by title for MVP, or track by sourceDocumentId)
          // Ideally we should track relations. For now, creating new ones.
          await this.requirementsService.create(
            {
              title: req.title,
              content: req.description,
              state: RequirementState.DRAFT,
              sourceDocumentId: document.id,
            },
            { tenantId },
          );
        }
      }

      // Also index in RAG
      await this.ragService.indexItem({
        id: document.id,
        tenantId,
        type: 'REQUIREMENT', // mapping generic doc to generic REQUIREMENT type for now, or update RAG types
        content: document.content,
        metadata: { title: document.title, source: 'DOCUMENT' },
      });

      return review;
    } catch (error: any) {
      this.logger.error(`Failed to analyze document ${document.id}`, error);

      if (
        error.message.includes('No AI provider configured') ||
        error.message.includes('API key not configured')
      ) {
        const { BadRequestException } = require('@nestjs/common');
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
