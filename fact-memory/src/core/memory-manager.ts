/**
 * FACT Memory System - Memory Manager
 * 
 * Core orchestration layer for memory storage and retrieval operations.
 * Integrates with memory models, provides context management, and handles
 * search, caching, and validation.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  AnyMemory,
  CreateAnyMemory,
  MemoryType,
  MemoryPriority,
  isPreferencesMemory,
  isFactsMemory,
  isContextMemory,
  isBehaviorMemory,
  MemoryTypeValidators,
  SafeMemoryValidators
} from '../models/memory-types.js';
import {
  MemoryEntry,
  CreateMemoryEntry,
  UpdateMemoryEntry,
  MemoryEntryUtils,
  MemoryEntryValidators,
  MemoryEntryStatus
} from '../models/memory-entry.js';
import {
  MemoryContext,
  CreateMemoryContext,
  UpdateMemoryContext,
  MemoryContextQuery,
  MemoryContextSearchResult,
  MemoryContextUtils,
  MemoryContextValidators,
  ContextType,
  ContextScope
} from '../models/memory-context.js';

/**
 * Memory search query interface
 */
export interface MemorySearchQuery {
  userId: string;
  query: string;
  types?: MemoryType[];
  limit?: number;
  offset?: number;
  minRelevance?: number;
  includeArchived?: boolean;
  contextId?: string;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Memory search result interface
 */
export interface MemorySearchResult {
  entry: MemoryEntry;
  relevanceScore: number;
  matchType: 'exact' | 'semantic' | 'keyword' | 'context';
  matchedFields: string[];
  contextMatch?: MemoryContext;
}

/**
 * Memory operation result interface
 */
export interface MemoryOperationResult {
  success: boolean;
  entryId?: string;
  contextId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Memory manager configuration
 */
export interface MemoryManagerConfig {
  maxMemoriesPerUser: number;
  maxContextsPerUser: number;
  defaultTTL: number;
  enableSemanticSearch: boolean;
  enableCache: boolean;
  cachePrefix: string;
  searchRelevanceThreshold: number;
  autoArchiveThresholdDays: number;
  enableValidation: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MemoryManagerConfig = {
  maxMemoriesPerUser: 10000,
  maxContextsPerUser: 1000,
  defaultTTL: 86400000, // 24 hours in milliseconds
  enableSemanticSearch: true,
  enableCache: true,
  cachePrefix: 'fact-memory',
  searchRelevanceThreshold: 0.6,
  autoArchiveThresholdDays: 30,
  enableValidation: true
};

/**
 * Memory statistics interface
 */
export interface MemoryStats {
  userId: string;
  totalMemories: number;
  totalContexts: number;
  memoriesByType: Record<MemoryType, number>;
  memoriesByStatus: Record<MemoryEntryStatus, number>;
  contextsByType: Record<ContextType, number>;
  averageRelevanceScore: number;
  cacheHitRate: number;
  storageUsed: number;
}

/**
 * Memory Manager - Core orchestration layer
 */
export class MemoryManager {
  private readonly config: MemoryManagerConfig;
  private readonly memoryStore: Map<string, MemoryEntry> = new Map();
  private readonly contextStore: Map<string, MemoryContext> = new Map();
  private readonly userMemoryIndex: Map<string, Set<string>> = new Map();
  private readonly userContextIndex: Map<string, Set<string>> = new Map();
  private readonly cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private initialized = false;

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the memory manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize indices and caches
    this.memoryStore.clear();
    this.contextStore.clear();
    this.userMemoryIndex.clear();
    this.userContextIndex.clear();
    this.cache.clear();

    // Set up cleanup intervals
    if (this.config.enableCache) {
      setInterval(() => this.cleanupExpiredCache(), 300000); // 5 minutes
    }

    this.initialized = true;
  }

  /**
   * Create a new memory entry
   */
  async createMemory(
    userId: string,
    memoryData: CreateAnyMemory,
    options: {
      contextId?: string;
      cacheKey?: string;
      tags?: string[];
      priority?: MemoryPriority;
    } = {}
  ): Promise<MemoryOperationResult> {
    try {
      this.ensureInitialized();
      
      // Validate input
      if (this.config.enableValidation) {
        const validation = SafeMemoryValidators.any(memoryData);
        if (!validation.success) {
          return {
            success: false,
            error: `Memory validation failed: ${validation.error.message}`
          };
        }
      }

      // Check user limits
      const userMemories = this.getUserMemoryIds(userId);
      if (userMemories.size >= this.config.maxMemoriesPerUser) {
        return {
          success: false,
          error: `Memory limit exceeded for user ${userId}. Maximum: ${this.config.maxMemoriesPerUser}`
        };
      }

      // Create memory object
      const memory: AnyMemory = {
        ...memoryData,
        id: memoryData.id || uuidv4(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 0,
        tags: [...(memoryData.tags || []), ...(options.tags || [])],
        priority: options.priority || memoryData.priority || 'medium'
      };

      // Create memory entry
      const entry = MemoryEntryUtils.createEntry(memory, {
        accessInfo: {
          lastAccessedAt: new Date(),
          accessCount: 0,
          accessPattern: 'write',
          sourceContext: options.contextId
        },
        cacheKey: options.cacheKey,
        createdBy: userId
      });

      // Store the entry
      this.memoryStore.set(entry.entryId, entry);
      this.addToUserIndex(userId, entry.entryId);

      // Associate with context if provided
      if (options.contextId) {
        await this.linkMemoryToContext(entry.entryId, options.contextId);
      }

      // Cache if enabled
      if (this.config.enableCache && entry.cacheKey) {
        this.setCacheEntry(entry.cacheKey, entry, this.config.defaultTTL);
      }

      return {
        success: true,
        entryId: entry.entryId,
        metadata: {
          memoryId: memory.id,
          type: memory.type,
          createdAt: memory.createdAt
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Retrieve a memory by ID
   */
  async getMemory(userId: string, entryId: string): Promise<MemoryEntry | null> {
    this.ensureInitialized();

    const entry = this.memoryStore.get(entryId);
    if (!entry || entry.memory.userId !== userId) {
      return null;
    }

    // Update access information
    const updatedEntry = MemoryEntryUtils.updateAccess(entry, 'read');
    this.memoryStore.set(entryId, updatedEntry);

    return updatedEntry;
  }

  /**
   * Search memories with relevance scoring
   */
  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
    this.ensureInitialized();

    const userMemoryIds = this.getUserMemoryIds(query.userId);
    const results: MemorySearchResult[] = [];

    for (const entryId of userMemoryIds) {
      const entry = this.memoryStore.get(entryId);
      if (!entry) continue;

      // Skip archived memories unless explicitly requested
      if (!query.includeArchived && entry.status === 'archived') {
        continue;
      }

      // Filter by type
      if (query.types && !query.types.includes(entry.memory.type)) {
        continue;
      }

      // Filter by date range
      if (query.dateRange) {
        const createdAt = entry.memory.createdAt;
        if (query.dateRange.start && createdAt < query.dateRange.start) continue;
        if (query.dateRange.end && createdAt > query.dateRange.end) continue;
      }

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(entry, query);
      if (relevanceScore < (query.minRelevance || this.config.searchRelevanceThreshold)) {
        continue;
      }

      // Determine match type and fields
      const { matchType, matchedFields } = this.analyzeMatch(entry, query);

      // Find context match if context ID provided
      let contextMatch: MemoryContext | undefined;
      if (query.contextId) {
        contextMatch = this.contextStore.get(query.contextId);
      }

      results.push({
        entry,
        relevanceScore,
        matchType,
        matchedFields,
        contextMatch
      });
    }

    // Sort by relevance and apply pagination
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    const offset = query.offset || 0;
    const limit = query.limit || 10;
    return results.slice(offset, offset + limit);
  }

  /**
   * Update an existing memory
   */
  async updateMemory(
    userId: string,
    entryId: string,
    updates: Partial<AnyMemory>
  ): Promise<MemoryOperationResult> {
    try {
      this.ensureInitialized();

      const existingEntry = await this.getMemory(userId, entryId);
      if (!existingEntry) {
        return {
          success: false,
          error: `Memory entry not found: ${entryId}`
        };
      }

      // Create updated memory
      const updatedMemory: AnyMemory = {
        ...existingEntry.memory,
        ...updates,
        id: existingEntry.memory.id, // Preserve ID
        userId: existingEntry.memory.userId, // Preserve user ID
        updatedAt: new Date()
      return 0;
    }
    
    return this.memoryStore.cleanupExpired();
  }

  /**
   * Shutdown the memory manager
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    await this.memoryStore.shutdown();
    await this.searchEngine.shutdown();
    
    this.initialized = false;
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized. Call initialize() first.');
    }
  }

  private async updateMemoryAccess(memory: Memory): Promise<void> {
    const updatedMemory = {
      ...memory,
      metadata: {
        ...memory.metadata,
        lastAccessedAt: new Date(),
        accessCount: memory.metadata.accessCount + 1
      }
    };
    
    await this.memoryStore.store(updatedMemory);
  }

  private async performKeywordSearch(query: MemoryQuery): Promise<MemorySearchResult[]> {
    // Simple keyword-based search fallback
    const memories = await this.memoryStore.getAllUserMemories(query.userId);
    const keywords = query.query.toLowerCase().split(/\s+/);
    
    const results: MemorySearchResult[] = [];
    
    for (const memory of memories) {
      const content = memory.content.toLowerCase();
      const matchCount = keywords.filter(keyword => content.includes(keyword)).length;
      
      if (matchCount > 0) {
        const relevanceScore = matchCount / keywords.length;
        
        if (relevanceScore >= this.config.searchRelevanceThreshold) {
          results.push({
            memory,
            relevanceScore,
            matchType: 'keyword',
            explanation: `Matched ${matchCount}/${keywords.length} keywords`
          });
        }
      }
    }
    
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 10));
  }
}