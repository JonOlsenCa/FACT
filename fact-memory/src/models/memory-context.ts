/**
 * FACT Memory System - Memory Context Model
 * 
 * Defines the structure for memory contexts that provide contextual information
 * about when and how memories were created, accessed, and used.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { MemoryType } from './memory-types.js';

/**
 * Context type enumeration
 */
export type ContextType = 
  | 'conversation'    // Within a conversation or chat session
  | 'task'           // During a specific task execution
  | 'session'        // Within a user session
  | 'application'    // Application-level context
  | 'temporal'       // Time-based context
  | 'environmental'  // Environmental conditions
  | 'user_state'     // User's current state or mood
  | 'system_state';  // System's current state

/**
 * Context scope levels
 */
export type ContextScope = 'global' | 'user' | 'session' | 'conversation' | 'local';

/**
 * Context priority levels
 */
export type ContextPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Memory context interface
 */
export interface MemoryContext {
  // Core identifiers
  id: string;
  userId: string;
  sessionId?: string | undefined;
  conversationId?: string | undefined;
  
  // Context metadata
  type: ContextType;
  scope: ContextScope;
  priority: ContextPriority;
  name: string;
  description?: string | undefined;
  
  // Temporal information
  createdAt: Date;
  updatedAt: Date;
  startTime?: Date | undefined;
  endTime?: Date | undefined;
  duration?: number | undefined; // in milliseconds
  
  // Context data
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];
  
  // Relationships
  parentContextId?: string | undefined;
  childContextIds: string[];
  relatedMemoryIds: string[];
  
  // State and lifecycle
  isActive: boolean;
  isExpired: boolean;
  expiresAt?: Date | undefined;
  
  // Usage tracking
  accessCount: number;
  lastAccessedAt?: Date | undefined;
  
  // Context-specific properties
  triggers: string[];           // What triggered this context
  conditions: string[];         // Conditions when this context applies
  outcomes: string[];          // Expected or actual outcomes
  
  // Quality and confidence
  confidence: number;          // 0-1 confidence in context accuracy
  reliability: number;         // 0-1 reliability score
  
  // System metadata
  source?: string | undefined;
  version: number;
  checksum?: string | undefined;
}

/**
 * Memory context validation schema
 */
export const MemoryContextSchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  
  type: z.enum(['conversation', 'task', 'session', 'application', 'temporal', 'environmental', 'user_state', 'system_state']),
  scope: z.enum(['global', 'user', 'session', 'conversation', 'local']).default('user'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  name: z.string().min(1, 'Context name is required'),
  description: z.string().optional(),
  
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().min(0).optional(),
  
  data: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  
  parentContextId: z.string().uuid().optional(),
  childContextIds: z.array(z.string().uuid()).default([]),
  relatedMemoryIds: z.array(z.string().uuid()).default([]),
  
  isActive: z.boolean().default(true),
  isExpired: z.boolean().default(false),
  expiresAt: z.date().optional(),
  
  accessCount: z.number().min(0).default(0),
  lastAccessedAt: z.date().optional(),
  
  triggers: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  
  confidence: z.number().min(0).max(1).default(1.0),
  reliability: z.number().min(0).max(1).default(1.0),
  
  source: z.string().optional(),
  version: z.number().min(1).default(1),
  checksum: z.string().optional()
});

/**
 * Context creation input schema
 */
export const CreateMemoryContextSchema = MemoryContextSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accessCount: true,
  childContextIds: true,
  relatedMemoryIds: true,
  isExpired: true,
  version: true
});

/**
 * Context update input schema
 */
export const UpdateMemoryContextSchema = MemoryContextSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true
});

/**
 * Context query schema
 */
export const MemoryContextQuerySchema = z.object({
  userId: z.string().min(1),
  types: z.array(z.enum(['conversation', 'task', 'session', 'application', 'temporal', 'environmental', 'user_state', 'system_state'])).optional(),
  scopes: z.array(z.enum(['global', 'user', 'session', 'conversation', 'local'])).optional(),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  includeExpired: z.boolean().default(false),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastAccessedAt', 'priority', 'confidence']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Context search result schema
 */
export const MemoryContextSearchResultSchema = z.object({
  context: MemoryContextSchema,
  relevanceScore: z.number().min(0).max(1),
  matchType: z.enum(['exact', 'partial', 'semantic', 'temporal']),
  matchedFields: z.array(z.string()).default([])
});

/**
 * Type inference
 */
export type CreateMemoryContext = z.infer<typeof CreateMemoryContextSchema>;
export type UpdateMemoryContext = z.infer<typeof UpdateMemoryContextSchema>;
export type MemoryContextQuery = z.infer<typeof MemoryContextQuerySchema>;
export type MemoryContextSearchResult = z.infer<typeof MemoryContextSearchResultSchema>;

/**
 * Memory context utility class
 */
export class MemoryContextUtils {
  /**
   * Create a conversation context
   */
  static createConversationContext(
    userId: string,
    conversationId: string,
    sessionId?: string,
    metadata?: Record<string, unknown>
  ): CreateMemoryContext {
    return {
      userId,
      sessionId,
      conversationId,
      type: 'conversation',
      scope: 'conversation',
      priority: 'medium',
      name: `Conversation Context - ${conversationId}`,
      description: 'Context for conversation-specific memories',
      data: {},
      metadata: metadata || {},
      tags: [],
      isActive: true,
      confidence: 1.0,
      reliability: 1.0,
      triggers: ['conversation_start'],
      conditions: ['active_conversation'],
      outcomes: ['contextual_memory_creation']
    };
  }

  /**
   * Create a task context
   */
  static createTaskContext(
    userId: string,
    taskName: string,
    taskData?: Record<string, unknown>,
    sessionId?: string
  ): CreateMemoryContext {
    return {
      userId,
      sessionId,
      type: 'task',
      scope: 'session',
      priority: 'medium',
      name: `Task Context - ${taskName}`,
      description: `Context for task: ${taskName}`,
      data: taskData || {},
      metadata: { taskName },
      tags: [],
      isActive: true,
      confidence: 1.0,
      reliability: 1.0,
      triggers: ['task_start'],
      conditions: ['task_execution'],
      outcomes: ['task_completion', 'task_memory_creation']
    };
  }

  /**
   * Create a session context
   */
  static createSessionContext(
    userId: string,
    sessionId: string,
    metadata?: Record<string, unknown>
  ): CreateMemoryContext {
    return {
      userId,
      sessionId,
      type: 'session',
      scope: 'session',
      priority: 'medium',
      name: `Session Context - ${sessionId}`,
      description: 'Context for session-specific activities',
      data: {},
      metadata: metadata || {},
      tags: [],
      isActive: true,
      confidence: 1.0,
      reliability: 1.0,
      triggers: ['session_start'],
      conditions: ['active_session'],
      outcomes: ['session_memory_tracking']
    };
  }

  /**
   * Create a temporal context
   */
  static createTemporalContext(
    userId: string,
    name: string,
    startTime: Date,
    endTime?: Date,
    metadata?: Record<string, unknown>
  ): CreateMemoryContext {
    return {
      userId,
      type: 'temporal',
      scope: 'user',
      priority: 'medium',
      name,
      description: 'Time-based context for temporal memory tracking',
      startTime,
      endTime,
      duration: endTime ? endTime.getTime() - startTime.getTime() : undefined,
      data: {},
      metadata: metadata || {},
      tags: [],
      isActive: true,
      confidence: 1.0,
      reliability: 1.0,
      triggers: ['time_period'],
      conditions: ['temporal_boundary'],
      outcomes: ['temporal_memory_association']
    };
  }

  /**
   * Update context with new access
   */
  static updateAccess(context: MemoryContext): MemoryContext {
    return {
      ...context,
      accessCount: context.accessCount + 1,
      lastAccessedAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Check if context is expired
   */
  static isExpired(context: MemoryContext): boolean {
    return context.isExpired || (context.expiresAt !== undefined && context.expiresAt < new Date());
  }

  /**
   * Check if context is active
   */
  static isActive(context: MemoryContext): boolean {
    return context.isActive && !this.isExpired(context);
  }

  /**
   * Calculate context duration
   */
  static calculateDuration(context: MemoryContext): number | null {
    if (!context.startTime) return null;
    const endTime = context.endTime || new Date();
    return endTime.getTime() - context.startTime.getTime();
  }

  /**
   * Add related memory to context
   */
  static addRelatedMemory(context: MemoryContext, memoryId: string): MemoryContext {
    if (context.relatedMemoryIds.includes(memoryId)) {
      return context;
    }
    
    return {
      ...context,
      relatedMemoryIds: [...context.relatedMemoryIds, memoryId],
      updatedAt: new Date()
    };
  }

  /**
   * Remove related memory from context
   */
  static removeRelatedMemory(context: MemoryContext, memoryId: string): MemoryContext {
    return {
      ...context,
      relatedMemoryIds: context.relatedMemoryIds.filter(id => id !== memoryId),
      updatedAt: new Date()
    };
  }

  /**
   * Generate context hierarchy path
   */
  static getHierarchyPath(contexts: MemoryContext[], contextId: string): string[] {
    const path: string[] = [];
    let currentId: string | undefined = contextId;
    
    while (currentId) {
      const context = contexts.find(c => c.id === currentId);
      if (!context) break;
      
      path.unshift(context.name);
      currentId = context.parentContextId;
    }
    
    return path;
  }

  /**
   * Filter contexts by type and scope
   */
  static filterContexts(
    contexts: MemoryContext[],
    type?: ContextType,
    scope?: ContextScope,
    activeOnly = true
  ): MemoryContext[] {
    return contexts.filter(context => {
      if (activeOnly && !this.isActive(context)) return false;
      if (type && context.type !== type) return false;
      if (scope && context.scope !== scope) return false;
      return true;
    });
  }
}

/**
 * Context validators
 */
export const MemoryContextValidators = {
  validateContext: (data: unknown): MemoryContext => MemoryContextSchema.parse(data) as MemoryContext,
  validateCreateContext: (data: unknown): CreateMemoryContext => CreateMemoryContextSchema.parse(data),
  validateUpdateContext: (data: unknown): UpdateMemoryContext => UpdateMemoryContextSchema.parse(data),
  validateQuery: (data: unknown): MemoryContextQuery => MemoryContextQuerySchema.parse(data),
  validateSearchResult: (data: unknown): MemoryContextSearchResult => MemoryContextSearchResultSchema.parse(data)
} as const;

/**
 * Safe validation functions
 */
export const SafeMemoryContextValidators = {
  context: (data: unknown) => MemoryContextSchema.safeParse(data),
  createContext: (data: unknown) => CreateMemoryContextSchema.safeParse(data),
  updateContext: (data: unknown) => UpdateMemoryContextSchema.safeParse(data),
  query: (data: unknown) => MemoryContextQuerySchema.safeParse(data),
  searchResult: (data: unknown) => MemoryContextSearchResultSchema.safeParse(data)
} as const;