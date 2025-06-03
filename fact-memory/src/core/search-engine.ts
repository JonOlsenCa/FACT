/**
 * FACT Memory System - Search Engine
 * 
 * Provides semantic search and memory retrieval based on query relevance.
 * Integrates with MemoryEntry and AnyMemory types for comprehensive search capabilities.
 */

import { z } from 'zod';
import { MemoryEntry, MemoryEntryUtils } from '../models/memory-entry.js';
import { AnyMemory, MemoryType, MemoryPriority, isPreferencesMemory, isFactsMemory, isContextMemory, isBehaviorMemory } from '../models/memory-types.js';

/**
 * Search query configuration
 */
export interface SearchQuery {
  userId: string;
  query: string;
  types?: MemoryType[];
  limit?: number;
  offset?: number;
  minConfidence?: number;
  includeExpired?: boolean;
  includeArchived?: boolean;
  tags?: string[];
  keywords?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'relevance' | 'recency' | 'frequency' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search result with scoring and explanation
 */
export interface SearchResult {
  entry: MemoryEntry;
  relevanceScore: number;
  matchType: 'exact' | 'semantic' | 'keyword' | 'fuzzy' | 'tag' | 'metadata';
  matchedTerms: string[];
  explanation: string;
  highlightedContent?: string;
}

/**
 * Search index entry for efficient retrieval
 */
interface SearchIndexEntry {
  entryId: string;
  userId: string;
  content: string;
  summary?: string;
  keywords: string[];
  tags: string[];
  systemTags: string[];
  type: MemoryType;
  priority: MemoryPriority;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  status: string;
  isValid: boolean;
  category?: string;
  contextType?: string;
  behaviorType?: string;
  sessionId?: string;
}

/**
 * Ranking factors for relevance scoring
 */
interface RankingFactors {
  contentRelevance: number;
  keywordMatch: number;
  tagMatch: number;
  exactMatch: number;
  recency: number;
  confidence: number;
  priority: number;
  accessFrequency: number;
  memoryValidity: number;
  typeRelevance: number;
}

/**
 * Search Engine Configuration
 */
export interface SearchEngineConfig {
  enableSemanticSearch: boolean;
  searchRelevanceThreshold: number;
  maxSearchResults: number;
  enableFuzzySearch: boolean;
  fuzzyMatchThreshold: number;
  enableHighlighting: boolean;
  rankingWeights: {
    contentRelevance: number;
    keywordMatch: number;
    tagMatch: number;
    exactMatch: number;
    recency: number;
    confidence: number;
    priority: number;
    accessFrequency: number;
    memoryValidity: number;
    typeRelevance: number;
  };
}

/**
 * Default search engine configuration
 */
const DEFAULT_CONFIG: SearchEngineConfig = {
  enableSemanticSearch: true,
  searchRelevanceThreshold: 0.1,
  maxSearchResults: 100,
  enableFuzzySearch: true,
  fuzzyMatchThreshold: 0.6,
  enableHighlighting: true,
  rankingWeights: {
    contentRelevance: 0.25,
    keywordMatch: 0.20,
    tagMatch: 0.15,
    exactMatch: 0.15,
    recency: 0.10,
    confidence: 0.05,
    priority: 0.05,
    accessFrequency: 0.03,
    memoryValidity: 0.02,
    typeRelevance: 0.00
  }
};

/**
 * Search Engine for FACT Memory System
 * 
 * Provides comprehensive search capabilities including:
 * - Text-based search with relevance scoring
 * - Filtering by memory type, context, and metadata
 * - Ranking algorithms for memory retrieval
 * - Support for limiting and pagination of results
 * - Extensible design for future search enhancements
 */
export class SearchEngine {
  private readonly config: SearchEngineConfig;
  private searchIndex: Map<string, SearchIndexEntry> = new Map();
  private userIndices: Map<string, Set<string>> = new Map();
  private typeIndices: Map<MemoryType, Set<string>> = new Map();
  private tagIndices: Map<string, Set<string>> = new Map();
  private keywordIndices: Map<string, Set<string>> = new Map();
  private initialized = false;

  constructor(config: Partial<SearchEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeIndices();
  }

  /**
   * Initialize the search engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.searchIndex.clear();
      this.userIndices.clear();
      this.typeIndices.clear();
      this.tagIndices.clear();
      this.keywordIndices.clear();
      this.initializeIndices();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize search engine: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Index a memory entry for search
   */
  async indexMemory(entry: MemoryEntry): Promise<void> {
    this.ensureInitialized();

    try {
      const indexEntry = this.createIndexEntry(entry);
      
      this.searchIndex.set(entry.entryId, indexEntry);
      this.addToUserIndex(entry.memory.userId, entry.entryId);
      this.addToTypeIndex(entry.memory.type, entry.entryId);
      
      [...entry.memory.tags, ...entry.systemTags].forEach(tag => {
        this.addToTagIndex(tag, entry.entryId);
      });
      
      entry.memory.keywords.forEach(keyword => {
        this.addToKeywordIndex(keyword, entry.entryId);
      });
      
    } catch (error) {
      throw new Error(`Failed to index memory entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update search index for a memory entry
   */
  async updateIndex(entry: MemoryEntry): Promise<void> {
    this.ensureInitialized();

    try {
      await this.removeFromIndex(entry.entryId);
      await this.indexMemory(entry);
    } catch (error) {
      throw new Error(`Failed to update search index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove memory entry from search index
   */
  async removeFromIndex(entryId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const indexEntry = this.searchIndex.get(entryId);
      
      if (indexEntry) {
        this.searchIndex.delete(entryId);
            suggestions.add(keyword);
          }
        }

        // Add matching tags
        for (const tag of entry.tags) {
          if (tag.toLowerCase().includes(queryLower)) {
            suggestions.add(tag);
          }
        }

        // Extract phrases from content
        const words = entry.content.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          if (phrase.includes(queryLower)) {
            suggestions.add(phrase);
          }
        }
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      throw new MemoryError(
        `Failed to get search suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SUGGESTIONS_ERROR',
        { userId, partialQuery }
      );
    }
  }

  /**
   * Get related memories
   */
  async getRelatedMemories(memoryId: string, limit = 5): Promise<MemorySearchResult[]> {
    this.ensureInitialized();

    try {
      const sourceEntry = this.searchIndex.get(memoryId);
      if (!sourceEntry) {
        return [];
      }

      const userMemoryIds = this.userIndices.get(sourceEntry.userId);
      if (!userMemoryIds) {
        return [];
      }

      const relatedMemories: Array<{ entry: SearchIndexEntry; score: number }> = [];

      // Find related memories based on content similarity
      for (const candidateId of userMemoryIds) {
        if (candidateId === memoryId) continue;

        const candidateEntry = this.searchIndex.get(candidateId);
        if (!candidateEntry) continue;

        const similarityScore = this.calculateContentSimilarity(sourceEntry, candidateEntry);
        
        if (similarityScore > 0.3) { // Minimum similarity threshold
          relatedMemories.push({ entry: candidateEntry, score: similarityScore });
        }
      }

      // Sort by similarity score
      relatedMemories.sort((a, b) => b.score - a.score);

      // Convert to search results
      const results: MemorySearchResult[] = [];
      for (const { entry, score } of relatedMemories.slice(0, limit)) {
        const memory = await this.reconstructMemoryFromIndex(entry);
        results.push({
          memory,
          relevanceScore: score,
          matchType: 'semantic',
          explanation: `Related content (${Math.round(score * 100)}% similarity)`
        });
      }

      return results;
    } catch (error) {
      throw new MemoryError(
        `Failed to get related memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RELATED_MEMORIES_ERROR',
        { memoryId }
      );
    }
  }

  /**
   * Shutdown the search engine
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      this.searchIndex.clear();
      this.userIndices.clear();
      this.initialized = false;
    } catch (error) {
      throw new MemoryError(
        `Failed to shutdown search engine: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SHUTDOWN_ERROR'
      );
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SearchEngine not initialized. Call initialize() first.');
    }
  }

  private async getCandidateMemories(query: MemoryQuery): Promise<SearchIndexEntry[]> {
    const userMemoryIds = this.userIndices.get(query.userId);
    if (!userMemoryIds) {
      return [];
    }

    const candidates: SearchIndexEntry[] = [];

    for (const memoryId of userMemoryIds) {
      const entry = this.searchIndex.get(memoryId);
      if (!entry) continue;

      // Filter by type if specified
      if (query.types && !query.types.includes(entry.type)) {
        continue;
      }

      // Filter by confidence
      if (entry.confidence < (query.minConfidence ?? 0.5)) {
        continue;
      }

      // Filter by date range
      if (query.dateRange) {
        if (query.dateRange.start && entry.createdAt < query.dateRange.start) {
          continue;
        }
        if (query.dateRange.end && entry.createdAt > query.dateRange.end) {
          continue;
        }
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        const hasMatchingTag = query.tags.some(tag => entry.tags.includes(tag));
        if (!hasMatchingTag) {
          continue;
        }
      }

      candidates.push(entry);
    }

    return candidates;
  }

  private async scoreAndRankCandidates(
    query: MemoryQuery, 
    candidates: SearchIndexEntry[]
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const queryTerms = this.tokenizeQuery(query.query);

    for (const candidate of candidates) {
      const rankingFactors = this.calculateRankingFactors(query, candidate, queryTerms);
      const relevanceScore = this.calculateRelevanceScore(rankingFactors);
      
      if (relevanceScore > 0) {
        const memory = await this.reconstructMemoryFromIndex(candidate);
        const matchType = this.determineMatchType(rankingFactors);
        const explanation = this.generateExplanation(rankingFactors, queryTerms);
        
        results.push({
          memory,
          relevanceScore,
          matchType,
          explanation
        });
      }
    }

    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 0);
  }

  private calculateRankingFactors(
    _query: MemoryQuery,
    candidate: SearchIndexEntry,
    queryTerms: string[]
  ): RankingFactors {
    const contentLower = candidate.content.toLowerCase();
    const keywordsLower = candidate.keywords.map(k => k.toLowerCase());
    
    // Content relevance (how well content matches query)
    const contentMatches = queryTerms.filter(term => contentLower.includes(term)).length;
    const contentRelevance = queryTerms.length > 0 ? contentMatches / queryTerms.length : 0;
    
    // Keyword match (exact keyword matches)
    const keywordMatches = queryTerms.filter(term => keywordsLower.includes(term)).length;
    const keywordMatch = queryTerms.length > 0 ? keywordMatches / queryTerms.length : 0;
    
    // Recency (newer memories score higher)
    const daysSinceCreation = (Date.now() - candidate.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 1 - (daysSinceCreation / 365)); // Score decreases over a year
    
    // Confidence from memory metadata
    const confidence = candidate.confidence;
    
    // Priority weight
    const priorityWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const priority = priorityWeights[candidate.priority];
    
    // Access frequency (more accessed = more relevant)
    const maxAccess = 100; // Normalize against a reasonable max
    const accessFrequency = Math.min(candidate.accessCount / maxAccess, 1.0);
    
    return {
      contentRelevance,
      keywordMatch,
      recency,
      confidence,
      priority,
      accessFrequency
    };
  }

  private calculateRelevanceScore(factors: RankingFactors): number {
    // Weighted combination of ranking factors
    const weights = {
      contentRelevance: 0.3,
      keywordMatch: 0.25,
      recency: 0.15,
      confidence: 0.1,
      priority: 0.1,
      accessFrequency: 0.1
    };
    
    return (
      factors.contentRelevance * weights.contentRelevance +
      factors.keywordMatch * weights.keywordMatch +
      factors.recency * weights.recency +
      factors.confidence * weights.confidence +
      factors.priority * weights.priority +
      factors.accessFrequency * weights.accessFrequency
    );
  }

  private determineMatchType(factors: RankingFactors): MemorySearchResult['matchType'] {
    if (factors.keywordMatch >= 0.8) return 'exact';
    if (factors.contentRelevance >= 0.7) return 'semantic';
    if (factors.keywordMatch > 0) return 'keyword';
    return 'fuzzy';
  }

  private generateExplanation(factors: RankingFactors, _queryTerms: string[]): string {
    const explanations: string[] = [];
    
    if (factors.keywordMatch > 0.5) {
      explanations.push(`Strong keyword match (${Math.round(factors.keywordMatch * 100)}%)`);
    }
    
    if (factors.contentRelevance > 0.5) {
      explanations.push(`Relevant content (${Math.round(factors.contentRelevance * 100)}%)`);
    }
    
    if (factors.recency > 0.8) {
      explanations.push('Recent memory');
    }
    
    if (factors.priority > 0.75) {
      explanations.push('High priority');
    }
    
    return explanations.join(', ') || 'General relevance match';
  }

  private calculateContentSimilarity(entry1: SearchIndexEntry, entry2: SearchIndexEntry): number {
    // Simple similarity based on shared keywords and tags
    const keywords1 = new Set(entry1.keywords.map(k => k.toLowerCase()));
    const keywords2 = new Set(entry2.keywords.map(k => k.toLowerCase()));
    const tags1 = new Set(entry1.tags.map(t => t.toLowerCase()));
    const tags2 = new Set(entry2.tags.map(t => t.toLowerCase()));
    
    const sharedKeywords = new Set([...keywords1].filter(k => keywords2.has(k)));
    const sharedTags = new Set([...tags1].filter(t => tags2.has(t)));
    
    const totalUnique = new Set([...keywords1, ...keywords2, ...tags1, ...tags2]).size;
    const totalShared = sharedKeywords.size + sharedTags.size;
    
    return totalUnique > 0 ? totalShared / totalUnique : 0;
  }

  private async reconstructMemoryFromIndex(entry: SearchIndexEntry): Promise<Memory> {
    // Reconstruct a memory object from the search index entry
    // This is a simplified version - in practice, you might need to fetch additional data
    return {
      metadata: {
        id: entry.memoryId,
        userId: entry.userId,
        type: entry.type,
        priority: entry.priority,
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt, // Simplified
        tags: entry.tags,
        confidence: entry.confidence,
        accessCount: entry.accessCount
      },
      content: entry.content,
      keywords: entry.keywords,
      relations: []
    };
  }
}