import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentAIReview } from './entities/document-ai-review.entity';
import { AiProviderFactory } from '../ai/providers/ai-provider.factory';
import { RagService } from '../ai/rag.service';
import { RequirementsService } from '../requirements/requirements.service';
import { RequirementState } from '../requirements/requirement.entity';

interface _AiRisk {
  risk: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
}

interface _AiGap {
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

interface _AiRequirement {
  title: string;
  description: string;
  priority: string;
  type: string;
  acceptanceCriteria: string[];
  tasks: AiTask[];
}

interface AiEpic {
  title: string;
  description: string;
  requirements?: Array<{
    title: string;
    description: string;
    priority?: string;
    type?: string;
    acceptanceCriteria?: string[];
    userStory?: string;
  }>;
}

interface AiAnalysisResult {
  score?: number;
  summary: string;
  risks?: Array<{ risk: string; severity: string; mitigation: string }>;
  gaps?: Array<{ gap: string; suggestion: string }>;
  epics?: AiEpic[];
}

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

      Goal: Break down the document into Epics (Features), then detailed Requirements for each Epic.
      DO NOT generate implementation tasks (FE/BE) at this stage. Focus on detailed user stories and acceptance criteria.

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
                "userStory": "As a... I want... So that...",
                "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                "type": "FUNCTIONAL" | "NON_FUNCTIONAL" | "BUG" | "FEATURE" | "ENHANCEMENT",
                "acceptanceCriteria": ["Criteria 1", "Criteria 2"]
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
      this.logger.log(`Response: ${response.content.substring(0, 200)}...`);

      let result: AiAnalysisResult;
      try {
        result = JSON.parse(response.content) as AiAnalysisResult;
      } catch (parseError) {
        this.logger.error('Failed to parse AI response as JSON', parseError);
        result = {
          score: 50,
          summary: response.content.substring(0, 500),
          risks: [],
          gaps: [],
        };
      }

      // Create or update review
      const review = this.reviewRepo.create({
        documentId: document.id,
        score: result.score ?? 50,
        summary: result.summary,
        risks: (result.risks || []).map((r) => ({
          risk: r.risk,
          severity: (['LOW', 'MEDIUM', 'HIGH'].includes(
            r.severity.toUpperCase(),
          )
            ? r.severity.toUpperCase()
            : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
          mitigation: r.mitigation,
        })),
        gaps: result.gaps || [],
      });

      let reqCount = 0;

      // Sync Requirements only in REQUIREMENTS mode
      if (
        mode === 'REQUIREMENTS' &&
        result.epics &&
        Array.isArray(result.epics)
      ) {
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
              await this.requirementsService.create(
                {
                  title: reqData.title || 'Untitled Requirement',
                  content:
                    (reqData.userStory
                      ? `**User Story:**\n${reqData.userStory}\n\n`
                      : '') +
                    (reqData.description || 'No description provided by AI'),
                  state: RequirementState.DRAFT,
                  priority: (reqData.priority &&
                  ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(
                    reqData.priority.toUpperCase(),
                  )
                    ? reqData.priority.toUpperCase()
                    : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
                  type: 'FUNCTIONAL', // Default to functional for children
                  acceptanceCriteria: reqData.acceptanceCriteria || [],
                  sourceDocumentId: document.id,
                  parentId: epic.id, // Link to Epic
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
          ? `\n\nGenerated ${reqCount} requirements. Awaiting approval for task generation.`
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
