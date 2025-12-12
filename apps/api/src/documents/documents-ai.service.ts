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

// ... (interfaces)

// Removed invalid import

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
    mode: 'REVIEW' | 'REQUIREMENTS' = 'REVIEW',
  ): Promise<DocumentAIReview> {
    this.logger.log(
      `Analyzing document ${document.id} for tenant ${tenantId} in mode ${mode}`,
    );

    const { provider, config } =
      await this.aiProviderFactory.getProvider(tenantId);

    const prompt = `
      You are an expert QA and Requirements Analyst.
      Analyze the following document and provide a structured review.
      
      Document Title: ${document.title}
      Content:
      ${document.content}

      Goal: Break down the document into Epics (Features), then Requirements for each Epic, and finally Implementation Tasks (FE/BE) for each Requirement.

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
        "epics": [
          {
            "title": "Epic/Feature Name",
            "description": "High-level description",
            "requirements": [
              { 
                "title": "Requirement Title", 
                "description": "Detailed functional listing",
                "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                "type": "FUNCTIONAL" | "NON_FUNCTIONAL" | "BUG" | "FEATURE" | "ENHANCEMENT",
                "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
                "tasks": [
                    {
                        "title": "FE: Task title" or "BE: Task title",
                        "description": "Task description",
                        "type": "task" | "feature" | "bug",
                        "suggestedRole": "Backend" | "Frontend" | "QA" | "DevOps",
                        "estimatedHours": number
                    }
                ]
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
          maxTokens: 4096, // Set to 4096 for current model (increase to 8192+ when using GPT-4o)
        },
        config.apiKey,
      );

      let result: any;
      try {
        result = JSON.parse(response.content);
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

      review.score = result.score || 0;
      review.summary = result.summary || '';
      review.risks = result.risks || [];
      review.gaps = result.gaps || [];

      let epicCount = 0;
      let reqCount = 0;
      let taskCount = 0;

      // Sync Requirements only in REQUIREMENTS mode
      if (
        mode === 'REQUIREMENTS' &&
        result.epics &&
        Array.isArray(result.epics)
      ) {
        epicCount = result.epics.length;
        for (const epicData of result.epics) {
          // 1. Create Epic (Requirement type FEATURE)
          const epic = await this.requirementsService.create(
            {
              title: epicData.title || 'Untitled Epic',
              content: epicData.description || 'No description provided by AI',
              state: RequirementState.DRAFT,
              priority: 'MEDIUM',
              type: 'FEATURE',
              sourceDocumentId: document.id,
              acceptanceCriteria: [],
            },
            {
              tenantId,
              userId: 'system-ai',
              email: 'ai@system.local',
              roles: ['system'],
              sub: 'system',
            }, // Mock user
          );

          // 2. Create Child Requirements
          if (epicData.requirements && Array.isArray(epicData.requirements)) {
            for (const reqData of epicData.requirements) {
              reqCount++;
              taskCount += reqData.tasks?.length || 0;

              await this.requirementsService.create(
                {
                  title: reqData.title || 'Untitled Requirement',
                  content:
                    reqData.description || 'No description provided by AI',
                  state: RequirementState.DRAFT,
                  priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(
                    reqData.priority?.toUpperCase(),
                  )
                    ? reqData.priority.toUpperCase()
                    : 'MEDIUM',
                  type: 'FUNCTIONAL', // Default to functional for children
                  acceptanceCriteria: reqData.acceptanceCriteria || [],
                  sourceDocumentId: document.id,
                  parentId: epic.id, // Link to Epic
                  tasks: reqData.tasks || [],
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
        }
      }

      review.summary =
        (result.summary || '') +
        (mode === 'REQUIREMENTS'
          ? `\n\nGenerated ${reqCount} requirements and ${taskCount} tasks.`
          : '\n\nAI Review completed (Risks & Gaps identified).');
      await this.reviewRepo.save(review);

      // Also index in RAG
      try {
        await this.ragService.indexItem({
          id: document.id,
          tenantId,
          type: 'REQUIREMENT', // mapping generic doc to generic REQUIREMENT type for now, or update RAG types
          content: document.content,
          metadata: { title: document.title, source: 'DOCUMENT' },
        });
      } catch (ragError) {
        this.logger.error('RAG Indexing failed (non-blocking)', ragError);
      }

      return review;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to analyze document ${document.id}: ${msg}`,
        error,
      );

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
