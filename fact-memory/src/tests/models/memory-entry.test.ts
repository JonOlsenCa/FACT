/**
 * FACT Memory System - Memory Entry Tests
 * 
 * Unit tests for memory entry validation, schemas, and utilities.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  MemoryEntry,
  MemoryEntryStatus,
  MemoryAccessInfo,
  CreateMemoryEntry,
  UpdateMemoryEntry,
  MemoryEntryValidators,
  SafeMemoryEntryValidators,
  MemoryEntryUtils
} from '../../models/memory-entry.js';
import { PreferencesMemory } from '../../models/memory-types.js';

describe('Memory Entry', () => {
  const mockUserId = 'user-123';
  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  const mockMemory: PreferencesMemory = {
    id: 'memory-456',
    userId: mockUserId,
    type: 'preferences',
    priority: 'medium',
    content: 'User prefers dark mode',
    keywords: ['ui', 'theme'],
    tags: ['ui'],
    confidence: 1.0,
    createdAt: baseDate,
    updatedAt: baseDate,
    relations: [],
    accessCount: 0,
    category: 'ui',
    value: 'dark',
    isGlobal: false,
    scope: ['user']
  };

  describe('MemoryEntry Creation and Validation', () => {
    test('should create valid memory entry', () => {
      const entry: MemoryEntry = {
        memory: mockMemory,
        entryId: 'entry-1',
        status: 'active',
        version: 1,
        checksum: 'abc123',
        cacheHits: 1,
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'read'
        },
        childEntryIds: [],
        linkedEntryIds: [],
        isValid: true,
        validationErrors: [],
        lastValidatedAt: baseDate,
        systemTags: []
      };

      const result = MemoryEntryValidators.validateEntry(entry);
      expect(result.entryId).toBe('entry-1');
      expect(result.status).toBe('active');
      expect(result.version).toBe(1);
      expect(result.accessInfo.accessCount).toBe(1);
    });

    test('should validate memory entry schema', () => {
      const validData = {
        memory: mockMemory,
        checksum: 'test-checksum',
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'write'
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.memory).toEqual(mockMemory);
        expect(result.data.status).toBe('active'); // default
      }
    });

    test('should fail validation with missing required fields', () => {
      const invalidData = {
        memory: mockMemory,
        // Missing checksum and accessInfo
      };

      const result = SafeMemoryEntryValidators.createEntry(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Memory Entry Status', () => {
    test('should handle all valid status values', () => {
      const statuses: MemoryEntryStatus[] = ['active', 'archived', 'deleted', 'expired'];
      
      for (const status of statuses) {
        const entry = {
          memory: mockMemory,
          checksum: 'test-checksum',
          status,
          accessInfo: {
            lastAccessedAt: baseDate,
            accessCount: 1,
            accessPattern: 'read' as const
          }
        };

        const result = SafeMemoryEntryValidators.createEntry(entry);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      }
    });

    test('should reject invalid status values', () => {
      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        status: 'invalid_status',
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'read'
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(entry);
      expect(result.success).toBe(false);
    });
  });

  describe('Memory Access Info', () => {
    test('should create valid access info', () => {
      const accessInfo: MemoryAccessInfo = {
        lastAccessedAt: baseDate,
        accessCount: 5,
        accessPattern: 'read',
        sourceContext: 'user-session'
      };

      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        accessInfo
      };

      const result = SafeMemoryEntryValidators.createEntry(entry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessInfo.accessCount).toBe(5);
        expect(result.data.accessInfo.accessPattern).toBe('read');
        expect(result.data.accessInfo.sourceContext).toBe('user-session');
      }
    });

    test('should validate access pattern values', () => {
      const accessPatterns: Array<'read' | 'write' | 'update' | 'delete'> = ['read', 'write', 'update', 'delete'];

      for (const pattern of accessPatterns) {
        const accessInfo: MemoryAccessInfo = {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: pattern
        };

        const result = SafeMemoryEntryValidators.accessInfo(accessInfo);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.accessPattern).toBe(pattern);
        }
      }
    });
  });

  describe('Memory Entry Versioning', () => {
    test('should handle status field', () => {
      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        status: 'archived' as const,
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'write' as const
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(entry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('archived');
      }
    });

    test('should reject negative versions', () => {
      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        version: -1,
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'write'
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(entry);
      expect(result.success).toBe(false);
    });

    test('should handle cache fields', () => {
      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        cacheKey: 'test-cache-key',
        cacheExpiry: new Date('2024-12-31'),
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'read' as const
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(entry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cacheKey).toBe('test-cache-key');
        expect(result.data.cacheExpiry).toEqual(new Date('2024-12-31'));
      }
    });
  });

  describe('Create and Update Types', () => {
    test('should create entry without auto-generated fields', () => {
      const createData: CreateMemoryEntry = {
        memory: mockMemory,
        status: 'active',
        checksum: 'test-checksum',
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 0,
          accessPattern: 'write'
        }
      };

      // Should not have auto-generated fields
      expect('entryId' in createData).toBe(false);

      // Should have required fields
      expect(createData.memory).toEqual(mockMemory);
      expect(createData.status).toBe('active');
      expect(createData.checksum).toBe('test-checksum');
      expect(createData.accessInfo.accessPattern).toBe('write');
    });

    test('should update entry with partial fields', () => {
      const updateData: UpdateMemoryEntry = {
        status: 'archived',
        version: 2
      };

      // Should only have fields being updated
      expect(updateData.status).toBe('archived');
      expect(updateData.version).toBe(2);
      expect('memory' in updateData).toBe(false);
      expect('entryId' in updateData).toBe(false);
    });
  });

  describe('Memory Entry Utils', () => {
    test('should generate checksum', () => {
      const checksum = MemoryEntryUtils.generateChecksum(mockMemory);
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });

    test('should create entry from memory', () => {
      const entry = MemoryEntryUtils.createEntry(mockMemory);
      expect(entry.memory).toEqual(mockMemory);
      expect(entry.status).toBe('active');
      expect(entry.version).toBe(1);
      expect(entry.cacheHits).toBe(0);
      expect(entry.accessInfo.accessPattern).toBe('write');
    });

    test('should update access information', () => {
      const originalEntry = MemoryEntryUtils.createEntry(mockMemory);
      const updatedEntry = MemoryEntryUtils.updateAccess(originalEntry, 'read', 'test-context');
      
      expect(updatedEntry.accessInfo.accessCount).toBe(1);
      expect(updatedEntry.accessInfo.accessPattern).toBe('read');
      expect(updatedEntry.accessInfo.sourceContext).toBe('test-context');
    });

    test('should increment cache hits', () => {
      const originalEntry = MemoryEntryUtils.createEntry(mockMemory);
      const updatedEntry = MemoryEntryUtils.incrementCacheHits(originalEntry);
      
      expect(updatedEntry.cacheHits).toBe(1);
    });

    test('should validate entry integrity', () => {
      const entry = MemoryEntryUtils.createEntry(mockMemory);
      const validation = MemoryEntryUtils.validateEntry(entry);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect checksum mismatch', () => {
      const entry = MemoryEntryUtils.createEntry(mockMemory);
      entry.checksum = 'invalid-checksum';
      
      const validation = MemoryEntryUtils.validateEntry(entry);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Checksum mismatch - memory content may have been corrupted');
    });

    test('should generate cache key', () => {
      const entry = MemoryEntryUtils.createEntry(mockMemory);
      const cacheKey = MemoryEntryUtils.generateCacheKey(entry);
      
      expect(cacheKey).toContain('fact-memory');
      expect(cacheKey).toContain(mockUserId);
      expect(cacheKey).toContain('preferences');
      expect(cacheKey).toContain(entry.entryId);
    });

    test('should determine if entry should be archived', () => {
      const oldEntry = MemoryEntryUtils.createEntry(mockMemory);
      oldEntry.accessInfo.lastAccessedAt = new Date('2020-01-01');
      oldEntry.accessInfo.accessCount = 2;
      
      const shouldArchive = MemoryEntryUtils.shouldArchive(oldEntry, 30);
      expect(shouldArchive).toBe(true);
    });

    test('should filter entries by status', () => {
      const entries = [
        { ...MemoryEntryUtils.createEntry(mockMemory), status: 'active' as const },
        { ...MemoryEntryUtils.createEntry(mockMemory), status: 'archived' as const },
        { ...MemoryEntryUtils.createEntry(mockMemory), status: 'active' as const }
      ];

      const activeEntries = MemoryEntryUtils.filterByStatus(entries, 'active');
      expect(activeEntries).toHaveLength(2);
      
      const archivedEntries = MemoryEntryUtils.filterByStatus(entries, 'archived');
      expect(archivedEntries).toHaveLength(1);
    });

    test('should sort entries by relevance', () => {
      const lowRelevanceEntry = MemoryEntryUtils.createEntry(mockMemory);
      lowRelevanceEntry.accessInfo.accessCount = 1;
      lowRelevanceEntry.accessInfo.lastAccessedAt = new Date('2020-01-01');

      const highRelevanceEntry = MemoryEntryUtils.createEntry(mockMemory);
      highRelevanceEntry.accessInfo.accessCount = 10;
      highRelevanceEntry.accessInfo.lastAccessedAt = new Date('2024-01-01');

      const entries = [lowRelevanceEntry, highRelevanceEntry];
      const sortedEntries = MemoryEntryUtils.sortByRelevance(entries);

      expect(sortedEntries[0]).toBe(highRelevanceEntry);
      expect(sortedEntries[1]).toBe(lowRelevanceEntry);
    });
  });

  describe('Memory Entry Edge Cases', () => {
    test('should handle optional fields', () => {
      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        cacheKey: 'optional-cache-key',
        createdBy: 'user-123',
        updatedBy: 'user-456',
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'read' as const,
          sourceContext: 'test-context'
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(entry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cacheKey).toBe('optional-cache-key');
        expect(result.data.createdBy).toBe('user-123');
        expect(result.data.updatedBy).toBe('user-456');
        expect(result.data.accessInfo.sourceContext).toBe('test-context');
      }
    });

    test('should handle missing optional fields', () => {
      const minimalEntry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'read' as const
        }
      };

      const result = SafeMemoryEntryValidators.createEntry(minimalEntry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active'); // default
        expect(result.data.memory).toEqual(mockMemory);
      }
    });
  });

  describe('Schema Validation Performance', () => {
    test('should handle validation efficiently', () => {
      const entry = {
        memory: mockMemory,
        checksum: 'test-checksum',
        accessInfo: {
          lastAccessedAt: baseDate,
          accessCount: 1,
          accessPattern: 'read' as const
        }
      };

      const start = performance.now();
      const result = SafeMemoryEntryValidators.createEntry(entry);
      const end = performance.now();

      expect(result.success).toBe(true);
      expect(end - start).toBeLessThan(50); // Should complete in < 50ms
    });
  });
});