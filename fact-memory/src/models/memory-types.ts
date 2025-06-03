/**
 * FACT Memory System - Memory Type Models
 * 
 * Defines the base memory interface and specific memory type implementations
 * with Zod validation schemas for type safety.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base memory interface that all memory types must implement
 */
export interface BaseMemory {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  summary?: string | undefined;
  keywords: string[];
  tags: string[];
  priority: MemoryPriority;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date | undefined;
  expiresAt?: Date | undefined;
  source?: string | undefined;
  relations: string[];
  accessCount: number;
}

/**
 * Memory types supported by the system
 */
export type MemoryType = 'preferences' | 'facts' | 'context' | 'behavior';

/**
 * Memory priority levels
 */
export type MemoryPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Base memory validation schema
 */
export const BaseMemorySchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['preferences', 'facts', 'context', 'behavior']),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  confidence: z.number().min(0).max(1).default(1.0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  lastAccessedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  source: z.string().optional(),
  relations: z.array(z.string().uuid()).default([]),
  accessCount: z.number().min(0).default(0)
});

/**
 * Preferences Memory - User preferences and settings
 */
export interface PreferencesMemory extends BaseMemory {
  type: 'preferences';
  category: 'ui' | 'behavior' | 'notification' | 'privacy' | 'general';
  value: string | number | boolean | object;
  isGlobal: boolean;
  scope: string[];
}

export const PreferencesMemorySchema = BaseMemorySchema.extend({
  type: z.literal('preferences'),
  category: z.enum(['ui', 'behavior', 'notification', 'privacy', 'general']).default('general'),
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())]),
  isGlobal: z.boolean().default(false),
  scope: z.array(z.string()).default([])
});

/**
 * Facts Memory - Factual information about the user
 */
export interface FactsMemory extends BaseMemory {
  type: 'facts';
  category: 'personal' | 'professional' | 'interests' | 'skills' | 'history' | 'relationships';
  isVerified: boolean;
  evidenceSource?: string | undefined;
  contradicts: string[];
}

export const FactsMemorySchema = BaseMemorySchema.extend({
  type: z.literal('facts'),
  category: z.enum(['personal', 'professional', 'interests', 'skills', 'history', 'relationships']).default('personal'),
  isVerified: z.boolean().default(false),
  evidenceSource: z.string().optional(),
  contradicts: z.array(z.string().uuid()).default([])
});

/**
 * Context Memory - Conversational and situational context
 */
export interface ContextMemory extends BaseMemory {
  type: 'context';
  sessionId?: string | undefined;
  conversationTurn: number;
  contextType: 'conversation' | 'task' | 'environment' | 'temporal';
  parentContext?: string | undefined;
  childContexts: string[];
}

export const ContextMemorySchema = BaseMemorySchema.extend({
  type: z.literal('context'),
  sessionId: z.string().optional(),
  conversationTurn: z.number().min(0).default(0),
  contextType: z.enum(['conversation', 'task', 'environment', 'temporal']).default('conversation'),
  parentContext: z.string().uuid().optional(),
  childContexts: z.array(z.string().uuid()).default([])
});

/**
 * Behavior Memory - User behavior patterns and habits
 */
export interface BehaviorMemory extends BaseMemory {
  type: 'behavior';
  behaviorType: 'pattern' | 'preference' | 'habit' | 'reaction' | 'decision';
  frequency: number;
  triggers: string[];
  outcomes: string[];
  confidence: number;
  lastObserved: Date;
}

export const BehaviorMemorySchema = BaseMemorySchema.extend({
  type: z.literal('behavior'),
  behaviorType: z.enum(['pattern', 'preference', 'habit', 'reaction', 'decision']).default('pattern'),
  frequency: z.number().min(0).default(1),
  triggers: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  lastObserved: z.date().default(() => new Date())
});

/**
 * Union type for all memory types
 */
export type AnyMemory = PreferencesMemory | FactsMemory | ContextMemory | BehaviorMemory;

/**
 * Union schema for validation
 */
export const AnyMemorySchema = z.discriminatedUnion('type', [
  PreferencesMemorySchema,
  FactsMemorySchema,
  ContextMemorySchema,
  BehaviorMemorySchema
]);

/**
 * Memory creation input schemas (without auto-generated fields)
 */
export const CreatePreferencesMemorySchema = PreferencesMemorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accessCount: true
});

export const CreateFactsMemorySchema = FactsMemorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accessCount: true
});

export const CreateContextMemorySchema = ContextMemorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accessCount: true
});

export const CreateBehaviorMemorySchema = BehaviorMemorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accessCount: true
});

/**
 * Type inference for creation schemas
 */
export type CreatePreferencesMemory = z.infer<typeof CreatePreferencesMemorySchema>;
export type CreateFactsMemory = z.infer<typeof CreateFactsMemorySchema>;
export type CreateContextMemory = z.infer<typeof CreateContextMemorySchema>;
export type CreateBehaviorMemory = z.infer<typeof CreateBehaviorMemorySchema>;

/**
 * Union type for memory creation
 */
export type CreateAnyMemory = CreatePreferencesMemory | CreateFactsMemory | CreateContextMemory | CreateBehaviorMemory;

/**
 * Type guards for memory types
 */
export function isPreferencesMemory(memory: AnyMemory): memory is PreferencesMemory {
  return memory.type === 'preferences';
}

export function isFactsMemory(memory: AnyMemory): memory is FactsMemory {
  return memory.type === 'facts';
}

export function isContextMemory(memory: AnyMemory): memory is ContextMemory {
  return memory.type === 'context';
}

export function isBehaviorMemory(memory: AnyMemory): memory is BehaviorMemory {
  return memory.type === 'behavior';
}

/**
 * Memory type validators
 */
export const MemoryTypeValidators = {
  validatePreferences: (data: unknown): PreferencesMemory => PreferencesMemorySchema.parse(data),
  validateFacts: (data: unknown): FactsMemory => FactsMemorySchema.parse(data),
  validateContext: (data: unknown): ContextMemory => ContextMemorySchema.parse(data),
  validateBehavior: (data: unknown): BehaviorMemory => BehaviorMemorySchema.parse(data),
  validateAny: (data: unknown): AnyMemory => AnyMemorySchema.parse(data)
} as const;

/**
 * Safe validation functions that return success/error results
 */
export const SafeMemoryValidators = {
  preferences: (data: unknown) => PreferencesMemorySchema.safeParse(data),
  facts: (data: unknown) => FactsMemorySchema.safeParse(data),
  context: (data: unknown) => ContextMemorySchema.safeParse(data),
  behavior: (data: unknown) => BehaviorMemorySchema.safeParse(data),
  any: (data: unknown) => AnyMemorySchema.safeParse(data)
} as const;