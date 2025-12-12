import { z } from 'zod';

/**
 * Requirement Schemas - Zod definitions
 *
 * These schemas provide:
 * 1. Runtime validation for API requests (backend)
 * 2. Runtime validation for API responses (frontend)
 * 3. Type inference via z.infer<typeof Schema>
 * 4. Shared definitions across frontend and backend
 *
 * Can be imported in frontend via monorepo symlink/path alias
 */

// Task embedded in requirements
export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  type: z.enum(['feature', 'bug', 'task']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  suggestedRole: z.string().optional(),
  estimatedHours: z
    .number()
    .int('Estimated hours must be a whole number')
    .positive('Estimated hours must be positive')
    .optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Acceptance criteria
export const AcceptanceCriteriaSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, 'Criteria description is required'),
  requirementId: z.string().uuid().optional(),
  createdAt: z.date().optional(),
});

// Full Requirement entity
export const RequirementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required'),
  state: z.enum(['DRAFT', 'APPROVED', 'BACKLOGGED', 'COMPLETED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z
    .enum(['FUNCTIONAL', 'NON_FUNCTIONAL', 'BUG', 'FEATURE', 'ENHANCEMENT'])
    .optional(),
  acceptanceCriteria: z.array(AcceptanceCriteriaSchema).optional(),
  tasks: z.array(TaskSchema).optional(),
  tenantId: z.string(),
  sourceDocumentId: z.string().uuid().optional(),
  rqs: z
    .object({
      score: z.number().int().min(0).max(100),
      clarity: z.number().min(0).max(100),
      completeness: z.number().min(0).max(100),
      testability: z.number().min(0).max(100),
      consistency: z.number().min(0).max(100),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create DTO - subset of full schema, no auto-generated fields
export const CreateRequirementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required'),
  state: z.enum(['DRAFT', 'APPROVED', 'BACKLOGGED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z
    .enum(['FUNCTIONAL', 'NON_FUNCTIONAL', 'BUG', 'FEATURE', 'ENHANCEMENT'])
    .optional(),
  acceptanceCriteria: z
    .array(
      z.object({
        description: z.string().min(1),
      }),
    )
    .optional(),
  tasks: z.array(TaskSchema).optional(),
  sourceDocumentId: z.string().uuid().optional(),
});

// Update DTO - all fields optional
export const UpdateRequirementSchema = CreateRequirementSchema.partial();

// Array of requirements (for list endpoints)
export const RequirementArraySchema = z.array(RequirementSchema);

// Type inference - use these for TypeScript types
export type Requirement = z.infer<typeof RequirementSchema>;
export type CreateRequirementDto = z.infer<typeof CreateRequirementSchema>;
export type UpdateRequirementDto = z.infer<typeof UpdateRequirementSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type AcceptanceCriteria = z.infer<typeof AcceptanceCriteriaSchema>;
