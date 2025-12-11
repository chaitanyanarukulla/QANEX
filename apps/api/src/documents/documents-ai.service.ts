import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentAIReview } from './entities/document-ai-review.entity';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';
import { RagService } from '../ai/rag.service';
import { RequirementsService } from '../requirements/requirements.service';
import { RequirementState } from '../requirements/requirement.entity';

interface AiRisk {
  risk: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
}

interface AiGap {
  gap: string;
  suggestion: string;
}

interface AiTask {
  title: string;
  description: string;
  type: string;
  suggestedRole: string;
  estimatedHours: number;
}

interface AiRequirement {
  title: string;
  description: string;
  priority: string;
  type: string;
  acceptanceCriteria: string[];
  tasks: AiTask[];
}

interface AiAnalysisResult {
  score: number;
  summary: string;
  risks: AiRisk[];
  gaps: AiGap[];
  requirements: AiRequirement[];
}

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
          { 
            "title": "Requirement Title", 
            "description": "Detailed description of functionality",
            "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
            "type": "FUNCTIONAL" | "NON_FUNCTIONAL" | "BUG" | "FEATURE" | "ENHANCEMENT",
            "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
            "tasks": [
                {
                    "title": "Task title",
                    "description": "Task description",
                    "type": "task" | "feature" | "bug",
                    "suggestedRole": "Backend" | "Frontend" | "QA" | "DevOps",
                    "estimatedHours": number
                }
            ]
          }
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
          maxTokens: 4000,
        },
        config.apiKey,
      );

      let result: AiAnalysisResult;
      try {
        result = JSON.parse(response.content) as AiAnalysisResult;
      } catch (jsonError) {
        this.logger.error('Failed to parse AI response JSON', jsonError);
        throw new Error(
          'AI response was invalid or truncated. Try reducing document size.',
        );
      }

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

      let reqCount = 0;
      let taskCount = 0;

      // Sync Requirements
      if (result.requirements && Array.isArray(result.requirements)) {
        reqCount = result.requirements.length;
        for (const req of result.requirements) {
          taskCount += req.tasks?.length || 0;

          // Note: In real world we would update existing ones if we can match them.
          // For now, we create new ones as per initial simple logic, but with more fields.
          await this.requirementsService.create(
            {
              title: req.title,
              content: req.description,
              state: RequirementState.DRAFT,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(
                req.priority?.toUpperCase(),
              )
                ? (req.priority.toUpperCase() as
                    | 'LOW'
                    | 'MEDIUM'
                    | 'HIGH'
                    | 'CRITICAL')
                : 'MEDIUM',
              type: [
                'FUNCTIONAL',
                'NON_FUNCTIONAL',
                'BUG',
                'FEATURE',
                'ENHANCEMENT',
              ].includes(req.type?.toUpperCase())
                ? (req.type.toUpperCase() as
                    | 'FUNCTIONAL'
                    | 'NON_FUNCTIONAL'
                    | 'BUG'
                    | 'FEATURE'
                    | 'ENHANCEMENT')
                : 'FUNCTIONAL',
              acceptanceCriteria: req.acceptanceCriteria || [],
              sourceDocumentId: document.id,
              tasks: req.tasks || [],
            },
            {
              tenantId,
              userId: 'system-ai',
              email: 'ai@system.local',
              roles: ['system'],
              sub: 'system',
            },
          );
        }
      }

      review.summary =
        (result.summary || '') +
        `\n\nGenerated ${reqCount} requirements and ${taskCount} tasks.`;
      await this.reviewRepo.save(review);

      // Also index in RAG
      await this.ragService.indexItem({
        id: document.id,
        tenantId,
        type: 'REQUIREMENT', // mapping generic doc to generic REQUIREMENT type for now, or update RAG types
        content: document.content,
        metadata: { title: document.title, source: 'DOCUMENT' },
      });

      return review;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to analyze document ${document.id}`, error);

      if (
        msg.includes('No AI provider configured') ||
        msg.includes('API key not configured')
      ) {
        throw new BadRequestException(msg);
      }
      throw error;
    }
  }
}
