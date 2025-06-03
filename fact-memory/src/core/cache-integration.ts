/**
 * FACT Memory System - Cache Integration
 * 
 * Integration layer with FACT's existing cache infrastructure for memory storage.
 */

import type { CacheConfig } from '../types/index.js';
import { CacheError } from '../types/index.js';

/**
 * Cache operation options
 */
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}

/**
 * CacheIntegration - Interface to FACT's cache infrastructure
 * 
 * Provides a unified interface for caching operations using FACT's existing
 * cache infrastructure with prompt caching optimizations.
 */
export class CacheIntegration {
  private readonly config: CacheConfig;
  private initialized = false;
  private cache: Map<string, { data: unknown; expires: number; tags: string[] }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalKeys: 0,
    memoryUsage: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Initialize the cache integration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize FACT cache connection
      // This would connect to the actual FACT cache infrastructure
      // For now, we'll use an in-memory implementation as a placeholder
      
      this.initialized = true;
    } catch (error) {
      throw new CacheError(
        `Failed to initialize cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR'
      );
    }
  }

  /**
   * Store data in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const ttl = options.ttl ?? this.config.ttl;
      const expires = Date.now() + (ttl * 1000);
      const tags = options.tags ?? [];

      // Compress data if enabled and requested
      let data: unknown = value;
      if (this.config.enableCompression && options.compress !== false) {
        data = await this.compressData(value);
      }

      // Store in cache
      this.cache.set(fullKey, { data, expires, tags });
      this.updateStats();

      // If using prompt caching, also store in prompt cache
      if (this.config.usePromptCaching) {
        await this.storeInPromptCache(fullKey, data, ttl);
      }
    } catch (error) {
      throw new CacheError(
        `Failed to set cache key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SET_ERROR',
        { key }
      );
    }
  }

  /**
   * Retrieve data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const cached = this.cache.get(fullKey);

      if (!cached) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Check expiration
      if (Date.now() > cached.expires) {
        this.cache.delete(fullKey);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      // Decompress if needed
      let data = cached.data;
      if (this.config.enableCompression && this.isCompressed(data)) {
        data = await this.decompressData(data);
      }

      return data as T;
    } catch (error) {
      throw new CacheError(
        `Failed to get cache key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_ERROR',
        { key }
      );
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const existed = this.cache.has(fullKey);
      
      this.cache.delete(fullKey);
      this.updateStats();

      // Also remove from prompt cache if using it
      if (this.config.usePromptCaching) {
        await this.removeFromPromptCache(fullKey);
      }

      return existed;
    } catch (error) {
      throw new CacheError(
        `Failed to delete cache key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR',
        { key }
      );
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildKey(key);
      const cached = this.cache.get(fullKey);

      if (!cached) {
        return false;
      }

      // Check expiration
      if (Date.now() > cached.expires) {
        this.cache.delete(fullKey);
        return false;
      }

      return true;
    } catch (error) {
      throw new CacheError(
        `Failed to check existence of cache key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXISTS_ERROR',
        { key }
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    this.ensureInitialized();
    return { ...this.stats };
  }

  /**
   * Clear cache by tags
   */
  async clearByTags(tags: string[]): Promise<number> {
    this.ensureInitialized();

    try {
      let clearedCount = 0;
      
      for (const [key, cached] of this.cache.entries()) {
        const hasMatchingTag = tags.some(tag => cached.tags.includes(tag));
        
        if (hasMatchingTag) {
          this.cache.delete(key);
          clearedCount++;
        }
      }

      this.updateStats();
      return clearedCount;
    } catch (error) {
      throw new CacheError(
        `Failed to clear cache by tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_BY_TAGS_ERROR',
        { tags }
      );
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    try {
      this.cache.clear();
      this.updateStats();
      
      if (this.config.usePromptCaching) {
        await this.clearPromptCache();
      }
    } catch (error) {
      throw new CacheError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_ERROR'
      );
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeys(pattern?: string): Promise<string[]> {
    this.ensureInitialized();

    try {
      const keys = Array.from(this.cache.keys());
      
      if (!pattern) {
        return keys.map(key => this.removePrefix(key));
      }

      const regex = new RegExp(pattern);
      return keys
        .filter(key => regex.test(key))
        .map(key => this.removePrefix(key));
    } catch (error) {
      throw new CacheError(
        `Failed to get keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_KEYS_ERROR',
        { pattern }
      );
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    this.ensureInitialized();

    try {
      let cleanedCount = 0;
      const now = Date.now();

      for (const [key, cached] of this.cache.entries()) {
        if (now > cached.expires) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      this.updateStats();
      return cleanedCount;
    } catch (error) {
      throw new CacheError(
        `Failed to cleanup expired entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEANUP_ERROR'
      );
    }
  }

  /**
   * Shutdown the cache integration
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Cleanup and close connections
      this.cache.clear();
      
      if (this.config.usePromptCaching) {
        await this.shutdownPromptCache();
      }
      
      this.initialized = false;
    } catch (error) {
      throw new CacheError(
        `Failed to shutdown cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SHUTDOWN_ERROR'
      );
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CacheIntegration not initialized. Call initialize() first.');
    }
  }

  private buildKey(key: string): string {
    return `${this.config.cachePrefix}:${key}`;
  }

  private removePrefix(key: string): string {
    const prefix = `${this.config.cachePrefix}:`;
    return key.startsWith(prefix) ? key.slice(prefix.length) : key;
  }

  private updateStats(): void {
    this.stats.totalKeys = this.cache.size;
    this.stats.memoryUsage = this.calculateMemoryUsage();
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private calculateMemoryUsage(): number {
    // Rough estimation of memory usage
    let usage = 0;
    for (const [key, cached] of this.cache.entries()) {
      usage += key.length * 2; // 2 bytes per character for string
      usage += JSON.stringify(cached.data).length * 2;
      usage += cached.tags.join('').length * 2;
      usage += 8; // expires timestamp
    }
    return usage;
  }

  private async compressData(data: unknown): Promise<unknown> {
    // Placeholder for compression implementation
    // In a real implementation, this would use a compression library
    return data;
  }

  private async decompressData(data: unknown): Promise<unknown> {
    // Placeholder for decompression implementation
    return data;
  }

  private isCompressed(_data: unknown): boolean {
    // Placeholder for compression detection
    return false;
  }

  // Prompt cache integration methods (placeholders)
  private async storeInPromptCache(_key: string, _data: unknown, _ttl: number): Promise<void> {
    // Placeholder for FACT prompt cache integration
    // This would integrate with Claude's prompt caching system
  }

  private async removeFromPromptCache(_key: string): Promise<void> {
    // Placeholder for prompt cache removal
  }

  private async clearPromptCache(): Promise<void> {
    // Placeholder for clearing prompt cache
  }

  private async shutdownPromptCache(): Promise<void> {
    // Placeholder for prompt cache shutdown
  }
}