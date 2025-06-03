/**
 * FACT Memory System - Type Definitions
 * 
 * Core types and interfaces for the memory management system.
 */

import { z } from 'zod';

/**
 * Supported memory types in the FACT Memory System
 */
export type MemoryType = 'preferences' | 'facts' | 'context' | 'behavior';

/**
 * Memory priority levels
 */
export type MemoryPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Memory metadata schema
 */
export const MemoryMetadataSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  type: z.enum(['preferences', 'facts', 'context', 'behavior']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastAccessedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  accessCount: z.number().min(0).default(0)
});

export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>;

/**
 * Core memory schema
 */
export const MemorySchema = z.object({
  metadata: MemoryMetadataSchema,
  content: z.string().min(1),
  summary: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  relations: z.array(z.string().uuid()).default([]),
  embedding: z.array(z.number()).optional(),
  cacheKey: z.string().optional()
});

export type Memory = z.infer<typeof MemorySchema>;

/**
 * Memory query schema
 */
export const MemoryQuerySchema = z.object({
  userId: z.string().min(1),
  query: z.string().min(1),
  types: z.array(z.enum(['preferences', 'facts', 'context', 'behavior'])).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  minConfidence: z.number().min(0).max(1).default(0.5),
  includeExpired: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional()
});

export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;

/**
 * Memory search result schema
 */
export const MemorySearchResultSchema = z.object({
  memory: MemorySchema,
  relevanceScore: z.number().min(0).max(1),
  matchType: z.enum(['exact', 'semantic', 'keyword', 'fuzzy']),
  highlightedContent: z.string().optional(),
  explanation: z.string().optional()
});

export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>;

/**
 * User context schema
 */
export const UserContextSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().optional(),
  currentContext: z.string().optional(),
  preferences: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type UserContext = z.infer<typeof UserContextSchema>;

/**
 * Memory configuration schema
 */
export const MemoryConfigSchema = z.object({
  maxMemoriesPerUser: z.number().min(1).default(10000),
  defaultMemoryType: z.enum(['preferences', 'facts', 'context', 'behavior']).default('context'),
  enableSemanticSearch: z.boolean().default(true),
  searchRelevanceThreshold: z.number().min(0).max(1).default(0.7),
  defaultTTL: z.number().min(0).default(3600),
  enableAutoExpiry: z.boolean().default(true),
  enableRelationTracking: z.boolean().default(true)
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

/**
 * Cache configuration schema
 */
export const CacheConfigSchema = z.object({
  ttl: z.number().min(0).default(3600),
  maxSize: z.number().min(1).default(1000),
  usePromptCaching: z.boolean().default(true),
  cachePrefix: z.string().default('fact-memory'),
  enableCompression: z.boolean().default(false),
  compressionLevel: z.number().min(1).max(9).default(6)
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/**
 * Memory operation result schema
 */
export const MemoryOperationResultSchema = z.object({
  success: z.boolean(),
  memoryId: z.string().uuid().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type MemoryOperationResult = z.infer<typeof MemoryOperationResultSchema>;

/**
 * Batch operation schema
 */
export const BatchOperationSchema = z.object({
  operations: z.array(z.object({
    type: z.enum(['create', 'update', 'delete', 'search']),
    memory: MemorySchema.optional(),
    query: MemoryQuerySchema.optional(),
    memoryId: z.string().uuid().optional()
  })),
  userId: z.string().min(1),
  transactional: z.boolean().default(false)
});

export type BatchOperation = z.infer<typeof BatchOperationSchema>;

/**
 * Memory statistics schema
 */
export const MemoryStatsSchema = z.object({
  userId: z.string().min(1),
  totalMemories: z.number().min(0),
  memoriesByType: z.record(z.enum(['preferences', 'facts', 'context', 'behavior']), z.number().min(0)),
  averageConfidence: z.number().min(0).max(1),
  oldestMemory: z.date().optional(),
  newestMemory: z.date().optional(),
  cacheHitRate: z.number().min(0).max(1).optional(),
  averageRetrievalTime: z.number().min(0).optional()
});

export type MemoryStats = z.infer<typeof MemoryStatsSchema>;

/**
 * Export utility functions for type checking
 */
export const TypeValidators = {
  isValidMemory: (data: unknown): data is Memory => MemorySchema.safeParse(data).success,
  isValidMemoryQuery: (data: unknown): data is MemoryQuery => MemoryQuerySchema.safeParse(data).success,
  isValidUserContext: (data: unknown): data is UserContext => UserContextSchema.safeParse(data).success,
  isValidMemoryConfig: (data: unknown): data is MemoryConfig => MemoryConfigSchema.safeParse(data).success,
  isValidCacheConfig: (data: unknown): data is CacheConfig => CacheConfigSchema.safeParse(data).success
} as const;

/**
 * Error types for the memory system
 */
export class MemoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class MemoryValidationError extends MemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'MemoryValidationError';
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(memoryId: string) {
    super(`Memory not found: ${memoryId}`, 'MEMORY_NOT_FOUND', { memoryId });
    this.name = 'MemoryNotFoundError';
  }
}

export class MemoryLimitExceededError extends MemoryError {
  constructor(userId: string, limit: number) {
    super(`Memory limit exceeded for user ${userId}: ${limit}`, 'MEMORY_LIMIT_EXCEEDED', { userId, limit });
    this.name = 'MemoryLimitExceededError';
  }
}

export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CacheError';
  }
}