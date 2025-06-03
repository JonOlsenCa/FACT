/**
 * FACT Memory System - Memory Entry Model
 * 
 * Defines the structure for memory entries with metadata, validation,
 * and utility methods for memory management.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AnyMemory, MemoryType, MemoryPriority } from './memory-types.js';

/**
 * Memory entry status
 */
export type MemoryEntryStatus = 'active' | 'archived' | 'deleted' | 'expired';

/**
 * Memory access metadata
 */
export interface MemoryAccessInfo {
  lastAccessedAt: Date;
  accessCount: number;
  accessPattern: 'read' | 'write' | 'update' | 'delete';
  sourceContext?: string | undefined;
}

/**
 * Memory entry interface extending the base memory with entry-specific metadata
 */
export interface MemoryEntry {
  // Core memory data
  memory: AnyMemory;
  
  // Entry metadata
  entryId: string;
  status: MemoryEntryStatus;
  version: number;
  checksum: string;
  
  // Cache information
  cacheKey?: string | undefined;
  cacheExpiry?: Date | undefined;
  cacheHits: number;
  
  // Access tracking
  accessInfo: MemoryAccessInfo;
  
  // Relationships
  parentEntryId?: string | undefined;
  childEntryIds: string[];
  linkedEntryIds: string[];
  
  // Validation and integrity
  isValid: boolean;
  validationErrors: string[];
  lastValidatedAt: Date;
  
  // System metadata
  createdBy?: string | undefined;
  updatedBy?: string | undefined;
  systemTags: string[];
}

/**
 * Memory access info schema
 */
export const MemoryAccessInfoSchema = z.object({
  lastAccessedAt: z.date(),
  accessCount: z.number().min(0),
  accessPattern: z.enum(['read', 'write', 'update', 'delete']),
  sourceContext: z.string().optional()
});

/**
 * Memory entry validation schema
 */
export const MemoryEntrySchema = z.object({
  memory: z.any().refine((val) => val !== undefined, {
    message: "Memory is required"
  }), // Will be validated separately using AnyMemorySchema
  
  entryId: z.string().uuid().default(() => uuidv4()),
  status: z.enum(['active', 'archived', 'deleted', 'expired']).default('active'),
  version: z.number().min(1).default(1),
  checksum: z.string().min(1),
  
  cacheKey: z.string().optional(),
  cacheExpiry: z.date().optional(),
  cacheHits: z.number().min(0).default(0),
  
  accessInfo: MemoryAccessInfoSchema,
  
  parentEntryId: z.string().uuid().optional(),
  childEntryIds: z.array(z.string().uuid()).default([]),
  linkedEntryIds: z.array(z.string().uuid()).default([]),
  
  isValid: z.boolean().default(true),
  validationErrors: z.array(z.string()).default([]),
  lastValidatedAt: z.date().default(() => new Date()),
  
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  systemTags: z.array(z.string()).default([])
});

/**
 * Memory entry creation input schema
 */
export const CreateMemoryEntrySchema = MemoryEntrySchema.omit({
  entryId: true,
  version: true,
  cacheHits: true,
  childEntryIds: true,
  linkedEntryIds: true,
  isValid: true,
  validationErrors: true,
  lastValidatedAt: true,
  systemTags: true
});

/**
 * Memory entry update input schema
 */
export const UpdateMemoryEntrySchema = MemoryEntrySchema.partial().omit({
  entryId: true,
  memory: true // Memory updates should go through specific memory update methods
});

/**
 * Type inference
 */
export type CreateMemoryEntry = z.infer<typeof CreateMemoryEntrySchema>;
export type UpdateMemoryEntry = z.infer<typeof UpdateMemoryEntrySchema>;

/**
 * Memory entry utility class
 */
export class MemoryEntryUtils {
  /**
   * Generate a checksum for a memory entry
   */
  static generateChecksum(memory: AnyMemory): string {
    const content = JSON.stringify({
      content: memory.content,
      type: memory.type,
      userId: memory.userId,
      updatedAt: memory.updatedAt.toISOString()
    });
    
    // Simple hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Create a new memory entry from memory data
   */
  static createEntry(
    memory: AnyMemory,
    options: Partial<CreateMemoryEntry> = {}
  ): MemoryEntry {
    const checksum = this.generateChecksum(memory);
    const now = new Date();
    
    return {
      memory,
      entryId: uuidv4(),
      status: 'active',
      version: 1,
      checksum,
      cacheHits: 0,
      accessInfo: {
        lastAccessedAt: now,
        accessCount: 0,
        accessPattern: 'write',
        sourceContext: options.accessInfo?.sourceContext
      },
      childEntryIds: [],
      linkedEntryIds: [],
      isValid: true,
      validationErrors: [],
      lastValidatedAt: now,
      systemTags: [],
      ...options
    };
  }

  /**
   * Update memory entry access information
   */
  static updateAccess(
    entry: MemoryEntry,
    accessPattern: 'read' | 'write' | 'update' | 'delete',
    sourceContext?: string
  ): MemoryEntry {
    return {
      ...entry,
      accessInfo: {
        lastAccessedAt: new Date(),
        accessCount: entry.accessInfo.accessCount + 1,
        accessPattern,
        sourceContext
      }
    };
  }

  /**
   * Increment cache hits
   */
  static incrementCacheHits(entry: MemoryEntry): MemoryEntry {
    return {
      ...entry,
      cacheHits: entry.cacheHits + 1
    };
  }

  /**
   * Validate memory entry integrity
   */
  static validateEntry(entry: MemoryEntry): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check if checksum matches current memory content
    const currentChecksum = this.generateChecksum(entry.memory);
    if (currentChecksum !== entry.checksum) {
      errors.push('Checksum mismatch - memory content may have been corrupted');
    }
    
    // Check if memory is expired
    if (entry.memory.expiresAt && entry.memory.expiresAt < new Date()) {
      errors.push('Memory has expired');
    }
    
    // Check status consistency
    if (entry.status === 'expired' && (!entry.memory.expiresAt || entry.memory.expiresAt > new Date())) {
      errors.push('Entry marked as expired but expiry date is in the future');
    }
    
    // Check cache expiry consistency
    if (entry.cacheExpiry && entry.cacheExpiry < new Date() && entry.status === 'active') {
      errors.push('Cache has expired but entry is still active');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a cache key for the memory entry
   */
  static generateCacheKey(entry: MemoryEntry): string {
    return `fact-memory:${entry.memory.userId}:${entry.memory.type}:${entry.entryId}`;
  }

  /**
   * Check if entry should be archived based on access patterns
   */
  static shouldArchive(entry: MemoryEntry, inactivityThresholdDays = 30): boolean {
    const daysSinceLastAccess = (Date.now() - entry.accessInfo.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastAccess > inactivityThresholdDays && entry.accessInfo.accessCount < 5;
  }

  /**
   * Filter entries by status
   */
  static filterByStatus(entries: MemoryEntry[], status: MemoryEntryStatus): MemoryEntry[] {
    return entries.filter(entry => entry.status === status);
  }

  /**
   * Sort entries by relevance (access count and recency)
   */
  static sortByRelevance(entries: MemoryEntry[]): MemoryEntry[] {
    return entries.sort((a, b) => {
      const aScore = a.accessInfo.accessCount + (a.accessInfo.lastAccessedAt.getTime() / 1000000);
      const bScore = b.accessInfo.accessCount + (b.accessInfo.lastAccessedAt.getTime() / 1000000);
      return bScore - aScore;
    });
  }
}

/**
 * Memory entry validators
 */
export const MemoryEntryValidators = {
  validateEntry: (data: unknown): MemoryEntry => MemoryEntrySchema.parse(data) as MemoryEntry,
  validateCreateEntry: (data: unknown): CreateMemoryEntry => CreateMemoryEntrySchema.parse(data),
  validateUpdateEntry: (data: unknown): UpdateMemoryEntry => UpdateMemoryEntrySchema.parse(data),
  validateAccessInfo: (data: unknown): MemoryAccessInfo => MemoryAccessInfoSchema.parse(data) as MemoryAccessInfo
} as const;

/**
 * Safe validation functions
 */
export const SafeMemoryEntryValidators = {
  entry: (data: unknown) => MemoryEntrySchema.safeParse(data),
  createEntry: (data: unknown) => CreateMemoryEntrySchema.safeParse(data),
  updateEntry: (data: unknown) => UpdateMemoryEntrySchema.safeParse(data),
  accessInfo: (data: unknown) => MemoryAccessInfoSchema.safeParse(data)
} as const;