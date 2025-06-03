/**
 * FACT Memory System - Memory Store
 * 
 * Core storage layer that manages memory persistence and retrieval using FACT's cache infrastructure.
 */

import type {
  Memory,
  MemoryStats,
  MemoryOperationResult
} from '../types/index.js';
import type { CacheIntegration } from './cache-integration.js';
import { MemoryError, MemoryNotFoundError } from '../types/index.js';

/**
 * MemoryStore - Core storage abstraction for memories
 * 
 * Provides persistent storage for memories using FACT's cache infrastructure
 * with optional fallback to other storage mechanisms.
 */
export class MemoryStore {
  private readonly cache: CacheIntegration;
  private initialized = false;

  constructor(cache: CacheIntegration) {
    this.cache = cache;
  }

  /**
   * Initialize the memory store
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.cache.initialize();
    this.initialized = true;
  }

  /**
   * Store a memory
   */
  async store(memory: Memory): Promise<MemoryOperationResult> {
    this.ensureInitialized();

    try {
      // Generate cache key if not present
      if (!memory.cacheKey) {
        memory.cacheKey = this.generateCacheKey(memory.metadata.userId, memory.metadata.id);
      }

      // Store in cache
      await this.cache.set(memory.cacheKey, memory, {
        ttl: this.calculateTTL(memory),
        tags: this.generateCacheTags(memory)
      });

      // Update user index
      await this.updateUserIndex(memory.metadata.userId, memory.metadata.id, 'add');

      return {
        success: true,
        memoryId: memory.metadata.id,
        metadata: { cacheKey: memory.cacheKey }
      };
    } catch (error) {
      throw new MemoryError(
        `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORE_ERROR',
        { memoryId: memory.metadata.id }
      );
    }
  }

  /**
   * Retrieve a memory by ID
   */
  async retrieve(memoryId: string): Promise<Memory | null> {
    this.ensureInitialized();

    try {
      // Try to find the memory in cache by scanning user indices
      const memory = await this.findMemoryInCache(memoryId);
      
      if (!memory) {
        return null;
      }

      // Check if memory has expired
      if (this.isMemoryExpired(memory)) {
        await this.delete(memoryId);
        return null;
      }

      return memory;
    } catch (error) {
      throw new MemoryError(
        `Failed to retrieve memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RETRIEVE_ERROR',
        { memoryId }
      );
    }
  }

  /**
   * Delete a memory
   */
  async delete(memoryId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const memory = await this.findMemoryInCache(memoryId);
      
      if (!memory) {
        throw new MemoryNotFoundError(memoryId);
      }

      // Remove from cache
      if (memory.cacheKey) {
        await this.cache.delete(memory.cacheKey);
      }

      // Update user index
      await this.updateUserIndex(memory.metadata.userId, memoryId, 'remove');
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        throw error;
      }
      
      throw new MemoryError(
        `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR',
        { memoryId }
      );
    }
  }

  /**
   * Get all memories for a user
   */
  async getAllUserMemories(userId: string): Promise<Memory[]> {
    this.ensureInitialized();

    try {
      const userIndex = await this.getUserIndex(userId);
      const memories: Memory[] = [];

      for (const memoryId of userIndex) {
        const memory = await this.retrieve(memoryId);
        if (memory) {
          memories.push(memory);
        }
      }

      return memories;
    } catch (error) {
      throw new MemoryError(
        `Failed to get user memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_USER_MEMORIES_ERROR',
        { userId }
      );
    }
  }

  /**
   * Get user memory statistics
   */
  async getUserStats(userId: string): Promise<MemoryStats> {
    this.ensureInitialized();

    try {
      const memories = await this.getAllUserMemories(userId);
      
      // Calculate statistics
      const memoriesByType = memories.reduce((acc, memory) => {
        const type = memory.metadata.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<Memory['metadata']['type'], number>);

      const totalConfidence = memories.reduce((sum, memory) => sum + memory.metadata.confidence, 0);
      const averageConfidence = memories.length > 0 ? totalConfidence / memories.length : 0;

      const dates = memories.map(m => m.metadata.createdAt).sort((a, b) => a.getTime() - b.getTime());
      const oldestMemory = dates[0];
      const newestMemory = dates[dates.length - 1];

      return {
        userId,
        totalMemories: memories.length,
        memoriesByType,
        averageConfidence,
        oldestMemory,
        newestMemory,
        cacheHitRate: await this.calculateCacheHitRate(userId),
        averageRetrievalTime: await this.calculateAverageRetrievalTime(userId)
      };
    } catch (error) {
      throw new MemoryError(
        `Failed to get user stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_STATS_ERROR',
        { userId }
      );
    }
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpired(): Promise<number> {
    this.ensureInitialized();

    let cleanedCount = 0;
    
    try {
      // Get all user indices
      const userIds = await this.getAllUserIds();
      
      for (const userId of userIds) {
        const memories = await this.getAllUserMemories(userId);
        
        for (const memory of memories) {
          if (this.isMemoryExpired(memory)) {
            await this.delete(memory.metadata.id);
            cleanedCount++;
          }
        }
      }
      
      return cleanedCount;
    } catch (error) {
      throw new MemoryError(
        `Failed to cleanup expired memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEANUP_ERROR'
      );
    }
  }

  /**
   * Shutdown the memory store
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.cache.shutdown();
    this.initialized = false;
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryStore not initialized. Call initialize() first.');
    }
  }

  private generateCacheKey(userId: string, memoryId: string): string {
    return `memory:${userId}:${memoryId}`;
  }

  private generateUserIndexKey(userId: string): string {
    return `user_index:${userId}`;
  }

  private generateCacheTags(memory: Memory): string[] {
    return [
      `user:${memory.metadata.userId}`,
      `type:${memory.metadata.type}`,
      `priority:${memory.metadata.priority}`,
      ...memory.metadata.tags.map(tag => `tag:${tag}`)
    ];
  }

  private calculateTTL(memory: Memory): number {
    if (memory.metadata.expiresAt) {
      const now = new Date();
      const expiry = memory.metadata.expiresAt;
      return Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
    }
    
    // Default TTL based on priority
    switch (memory.metadata.priority) {
      case 'critical': return 86400 * 30; // 30 days
      case 'high': return 86400 * 7;      // 7 days
      case 'medium': return 86400;        // 1 day
      case 'low': return 3600;            // 1 hour
      default: return 3600;
    }
  }

  private isMemoryExpired(memory: Memory): boolean {
    if (!memory.metadata.expiresAt) {
      return false;
    }
    
    return new Date() > memory.metadata.expiresAt;
  }

  private async findMemoryInCache(memoryId: string): Promise<Memory | null> {
    // Since we don't know the userId, we need to search through user indices
    // This is inefficient but necessary without a global memory index
    const userIds = await this.getAllUserIds();
    
    for (const userId of userIds) {
      const cacheKey = this.generateCacheKey(userId, memoryId);
      const memory = await this.cache.get<Memory>(cacheKey);
      
      if (memory) {
        return memory;
      }
    }
    
    return null;
  }

  private async getUserIndex(userId: string): Promise<string[]> {
    const indexKey = this.generateUserIndexKey(userId);
    const index = await this.cache.get<string[]>(indexKey);
    return index || [];
  }

  private async updateUserIndex(userId: string, memoryId: string, operation: 'add' | 'remove'): Promise<void> {
    const indexKey = this.generateUserIndexKey(userId);
    const currentIndex = await this.getUserIndex(userId);
    
    let updatedIndex: string[];
    
    if (operation === 'add') {
      if (!currentIndex.includes(memoryId)) {
        updatedIndex = [...currentIndex, memoryId];
      } else {
        updatedIndex = currentIndex;
      }
    } else {
      updatedIndex = currentIndex.filter(id => id !== memoryId);
    }
    
    await this.cache.set(indexKey, updatedIndex, { ttl: 86400 * 30 }); // 30 days TTL for index
  }

  private async getAllUserIds(): Promise<string[]> {
    // This would need to be implemented based on the cache's capabilities
    // For now, we'll return an empty array as a placeholder
    // In a real implementation, this might involve scanning cache keys or maintaining a global user index
    return [];
  }

  private async calculateCacheHitRate(_userId: string): Promise<number | undefined> {
    // Placeholder - would need cache statistics
    return undefined;
  }

  private async calculateAverageRetrievalTime(_userId: string): Promise<number | undefined> {
    // Placeholder - would need performance tracking
    return undefined;
  }
}