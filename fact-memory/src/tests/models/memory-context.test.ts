/**
 * FACT Memory System - Memory Context Tests
 * 
 * Unit tests for memory context validation, schemas, and utilities.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  MemoryContext,
  ContextScope,
  ContextType,
  ContextPriority,
  CreateMemoryContext,
  UpdateMemoryContext,
  MemoryContextQuery,
  MemoryContextSearchResult,
  MemoryContextSchema,
  CreateMemoryContextSchema,
  UpdateMemoryContextSchema,
  MemoryContextQuerySchema,
  MemoryContextSearchResultSchema,
  MemoryContextUtils
} from '../../models/memory-context.js';

describe('Memory Context', () => {
  const mockUserId = 'user-123';
  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  describe('MemoryContext Creation and Validation', () => {
    test('should create valid memory context', () => {
      const context: MemoryContext = {
        id: 'context-1',
        userId: mockUserId,
        sessionId: 'session-456',
        conversationId: 'conv-789',
        type: 'conversation',
        scope: 'session',
        priority: 'medium',
        name: 'User Chat Session',
        description: 'Context for user chat session',
        createdAt: baseDate,
        updatedAt: baseDate,
        startTime: baseDate,
        endTime: new Date('2024-01-01T01:00:00.000Z'),
        duration: 3600000,
        data: { source: 'chat' },
        metadata: { topic: 'project discussion' },
        tags: ['chat', 'project'],
        parentContextId: 'parent-ctx-1',
        childContextIds: ['child-ctx-1', 'child-ctx-2'],
        relatedMemoryIds: ['memory-1', 'memory-2'],
        isActive: true,
        isExpired: false,
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        accessCount: 5,
        lastAccessedAt: baseDate,
        triggers: ['user_message'],
        conditions: ['active_session'],
        outcomes: ['memory_created'],
        confidence: 0.9,
        reliability: 0.95,
        source: 'chat-interface',
        version: 1,
        checksum: 'abc123'
      };

      const result = MemoryContextSchema.parse(context);
      expect(result.id).toBe('context-1');
      expect(result.name).toBe('User Chat Session');
      expect(result.type).toBe('conversation');
      expect(result.scope).toBe('session');
      expect(result.isActive).toBe(true);
      expect(result.relatedMemoryIds).toHaveLength(2);
    });

    test('should validate memory context schema with defaults', () => {
      const validData = {
        userId: mockUserId,
        type: 'session' as ContextType,
        name: 'New Context'
      };

      const result = MemoryContextSchema.parse(validData);
      expect(result.userId).toBe(mockUserId);
      expect(result.name).toBe('New Context');
      expect(result.type).toBe('session');
      expect(result.scope).toBe('user'); // default
      expect(result.priority).toBe('medium'); // default
      expect(result.isActive).toBe(true); // default
      expect(result.isExpired).toBe(false); // default
      expect(result.version).toBe(1); // default
      expect(result.confidence).toBe(1.0); // default
      expect(result.reliability).toBe(1.0); // default
      expect(result.relatedMemoryIds).toEqual([]); // default
      expect(result.tags).toEqual([]); // default
    });

    test('should fail validation with missing required fields', () => {
      const invalidData = {
        name: 'Incomplete Context'
        // Missing userId and type
      };

      expect(() => MemoryContextSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Context Types and Scopes', () => {
    test('should handle all valid context types', () => {
      const types: ContextType[] = [
        'conversation', 'task', 'session', 'application', 
        'temporal', 'environmental', 'user_state', 'system_state'
      ];
      
      for (const type of types) {
        const context = {
          userId: mockUserId,
          type,
          name: `Context with ${type} type`
        };

        const result = MemoryContextSchema.parse(context);
        expect(result.type).toBe(type);
      }
    });

    test('should handle all valid scope values', () => {
      const scopes: ContextScope[] = ['global', 'user', 'session', 'conversation', 'local'];
      
      for (const scope of scopes) {
        const context = {
          userId: mockUserId,
          type: 'session' as ContextType,
          name: `Context with ${scope} scope`,
          scope
        };

        const result = MemoryContextSchema.parse(context);
        expect(result.scope).toBe(scope);
      }
    });

    test('should handle all valid priority levels', () => {
      const priorities: ContextPriority[] = ['low', 'medium', 'high', 'critical'];
      
      for (const priority of priorities) {
        const context = {
          userId: mockUserId,
          type: 'task' as ContextType,
          name: `Context with ${priority} priority`,
          priority
        };

        const result = MemoryContextSchema.parse(context);
        expect(result.priority).toBe(priority);
      }
    });

    test('should reject invalid values', () => {
      expect(() => MemoryContextSchema.parse({
        userId: mockUserId,
        type: 'invalid_type',
        name: 'Invalid Type Context'
      })).toThrow();

      expect(() => MemoryContextSchema.parse({
        userId: mockUserId,
        type: 'session',
        name: 'Invalid Scope Context',
        scope: 'invalid_scope'
      })).toThrow();
    });
  });

  describe('Context Temporal Properties', () => {
    test('should handle temporal fields correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00.000Z');
      const endTime = new Date('2024-01-01T11:30:00.000Z');
      const duration = 5400000; // 1.5 hours in milliseconds

      const context = {
        userId: mockUserId,
        type: 'temporal' as ContextType,
        name: 'Temporal Context',
        startTime,
        endTime,
        duration,
        expiresAt: new Date('2024-12-31')
      };

      const result = MemoryContextSchema.parse(context);
      expect(result.startTime).toEqual(startTime);
      expect(result.endTime).toEqual(endTime);
      expect(result.duration).toBe(duration);
      expect(result.expiresAt).toEqual(new Date('2024-12-31'));
    });

    test('should validate numeric constraints', () => {
      expect(() => MemoryContextSchema.parse({
        userId: mockUserId,
        type: 'session',
        name: 'Invalid Duration',
        duration: -100 // negative duration should fail
      })).toThrow();

      expect(() => MemoryContextSchema.parse({
        userId: mockUserId,
        type: 'session',
        name: 'Invalid Confidence',
        confidence: 1.5 // > 1.0 should fail
      })).toThrow();

      expect(() => MemoryContextSchema.parse({
        userId: mockUserId,
        type: 'session',
        name: 'Invalid Access Count',
        accessCount: -5 // negative should fail
      })).toThrow();
    });
  });

  describe('Context Relationships', () => {
    test('should handle context relationships', () => {
      const context = {
        userId: mockUserId,
        type: 'conversation' as ContextType,
        name: 'Parent Context',
        parentContextId: 'parent-123',
        childContextIds: ['child-1', 'child-2'],
        relatedMemoryIds: ['mem-1', 'mem-2', 'mem-3']
      };

      const result = MemoryContextSchema.parse(context);
      expect(result.parentContextId).toBe('parent-123');
      expect(result.childContextIds).toEqual(['child-1', 'child-2']);
      expect(result.relatedMemoryIds).toEqual(['mem-1', 'mem-2', 'mem-3']);
    });

    test('should validate UUID format for relationships', () => {
      expect(() => MemoryContextSchema.parse({
        userId: mockUserId,
        type: 'session',
        name: 'Invalid Parent UUID',
        parentContextId: 'not-a-uuid'
      })).toThrow();
    });
  });

  describe('Create and Update Schemas', () => {
    test('should create context without auto-generated fields', () => {
      const createData: CreateMemoryContext = {
        userId: mockUserId,
        type: 'conversation',
        name: 'New Context',
        scope: 'user',
        sessionId: 'session-789',
        description: 'Test context'
      };

      // Should not have auto-generated fields
      expect('id' in createData).toBe(false);
      expect('createdAt' in createData).toBe(false);
      expect('updatedAt' in createData).toBe(false);

      // Should have required fields
      expect(createData.userId).toBe(mockUserId);
      expect(createData.type).toBe('conversation');
      expect(createData.name).toBe('New Context');

      const result = CreateMemoryContextSchema.parse(createData);
      expect(result.type).toBe('conversation');
      expect(result.scope).toBe('user');
    });

    test('should update context with partial fields', () => {
      const updateData: UpdateMemoryContext = {
        name: 'Updated Context Name',
        isActive: false,
        metadata: {
          updated: true
        }
      };

      // Should only have fields being updated
      expect(updateData.name).toBe('Updated Context Name');
      expect(updateData.isActive).toBe(false);
      expect('userId' in updateData).toBe(false);
      expect('type' in updateData).toBe(false);

      const result = UpdateMemoryContextSchema.parse(updateData);
      expect(result.name).toBe('Updated Context Name');
      expect(result.isActive).toBe(false);
    });
  });

  describe('Context Query Schema', () => {
    test('should validate context queries', () => {
      const query: MemoryContextQuery = {
        userId: mockUserId,
        types: ['conversation', 'task'],
        scopes: ['user', 'session'],
        isActive: true,
        tags: ['important'],
        limit: 20,
        offset: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      };

      const result = MemoryContextQuerySchema.parse(query);
      expect(result.types).toEqual(['conversation', 'task']);
      expect(result.scopes).toEqual(['user', 'session']);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(10);
    });

    test('should apply query defaults', () => {
      const minimalQuery = {
        userId: mockUserId
      };

      const result = MemoryContextQuerySchema.parse(minimalQuery);
      expect(result.limit).toBe(10); // default
      expect(result.offset).toBe(0); // default
      expect(result.includeExpired).toBe(false); // default
      expect(result.sortBy).toBe('updatedAt'); // default
      expect(result.sortOrder).toBe('desc'); // default
    });
  });

  describe('Context Search Result Schema', () => {
    test('should validate search results', () => {
      const mockContext: MemoryContext = {
        id: 'ctx-1',
        userId: mockUserId,
        type: 'conversation',
        scope: 'user',
        priority: 'medium',
        name: 'Search Result Context',
        createdAt: baseDate,
        updatedAt: baseDate,
        data: {},
        metadata: {},
        tags: [],
        childContextIds: [],
        relatedMemoryIds: [],
        isActive: true,
        isExpired: false,
        accessCount: 0,
        triggers: [],
        conditions: [],
        outcomes: [],
        confidence: 1.0,
        reliability: 1.0,
        version: 1
      };

      const searchResult: MemoryContextSearchResult = {
        context: mockContext,
        relevanceScore: 0.85,
        matchType: 'semantic',
        matchedFields: ['name', 'tags']
      };

      const result = MemoryContextSearchResultSchema.parse(searchResult);
      expect(result.relevanceScore).toBe(0.85);
      expect(result.matchType).toBe('semantic');
      expect(result.matchedFields).toEqual(['name', 'tags']);
    });
  });

  describe('Memory Context Utils', () => {
    test('should create conversation context', () => {
      const conversationId = 'conv-123';
      const sessionId = 'session-456';
      const metadata = { topic: 'AI discussion' };

      const context = MemoryContextUtils.createConversationContext(
        mockUserId,
        conversationId,
        sessionId,
        metadata
      );

      expect(context.userId).toBe(mockUserId);
      expect(context.conversationId).toBe(conversationId);
      expect(context.sessionId).toBe(sessionId);
      expect(context.type).toBe('conversation');
      expect(context.scope).toBe('conversation');
      expect(context.priority).toBe('medium');
      expect(context.name).toBe(`Conversation Context - ${conversationId}`);
      expect(context.metadata).toEqual(metadata);
      expect(context.isActive).toBe(true);
      expect(context.confidence).toBe(1.0);
      expect(context.triggers).toContain('conversation_start');
    });

    test('should create task context', () => {
      const taskName = 'Data Analysis';
      const taskData = { projectId: 'proj-123' };
      const sessionId = 'session-789';

      const context = MemoryContextUtils.createTaskContext(
        mockUserId,
        taskName,
        taskData,
        sessionId
      );

      expect(context.userId).toBe(mockUserId);
      expect(context.sessionId).toBe(sessionId);
      expect(context.type).toBe('task');
      expect(context.scope).toBe('session');
      expect(context.name).toBe(`Task Context - ${taskName}`);
      expect(context.data).toEqual(taskData);
      expect(context.triggers).toContain('task_start');
      expect(context.outcomes).toContain('task_completion');
    });
  });

  describe('Context Edge Cases', () => {
    test('should handle empty arrays and objects', () => {
      const context = {
        userId: mockUserId,
        type: 'session' as ContextType,
        name: 'Empty Context',
        data: {},
        metadata: {},
        tags: [],
        childContextIds: [],
        relatedMemoryIds: [],
        triggers: [],
        conditions: [],
        outcomes: []
      };

      const result = MemoryContextSchema.parse(context);
      expect(result.data).toEqual({});
      expect(result.metadata).toEqual({});
      expect(result.tags).toEqual([]);
      expect(result.childContextIds).toEqual([]);
      expect(result.relatedMemoryIds).toEqual([]);
      expect(result.triggers).toEqual([]);
    });

    test('should handle missing optional fields', () => {
      const minimalContext = {
        userId: mockUserId,
        type: 'application' as ContextType,
        name: 'Minimal Context'
      };

      const result = MemoryContextSchema.parse(minimalContext);
      expect(result.scope).toBe('user'); // default
      expect(result.priority).toBe('medium'); // default
      expect(result.isActive).toBe(true); // default
      expect(result.isExpired).toBe(false); // default
      expect(result.version).toBe(1); // default
      expect(result.accessCount).toBe(0); // default
      expect(result.confidence).toBe(1.0); // default
      expect(result.reliability).toBe(1.0); // default
    });

    test('should validate complex nested data', () => {
      const complexData = {
        nested: {
          level1: {
            level2: {
              values: [1, 2, 3],
              metadata: { key: 'value' }
            }
          }
        }
      };

      const context = {
        userId: mockUserId,
        type: 'application' as ContextType,
        name: 'Complex Data Context',
        data: complexData,
        metadata: { complexity: 'high' }
      };

      const result = MemoryContextSchema.parse(context);
      expect(result.data).toEqual(complexData);
      expect(result.metadata.complexity).toBe('high');
    });
  });

  describe('Schema Validation Performance', () => {
    test('should handle large arrays efficiently', () => {
      const largeRelatedMemoryIds = Array.from({ length: 1000 }, (_, i) => 
        `550e8400-e29b-41d4-a716-44665544000${i.toString().padStart(1, '0')}`
      );
      
      const context = {
        userId: mockUserId,
        type: 'session' as ContextType,
        name: 'Context with many memories',
        relatedMemoryIds: largeRelatedMemoryIds
      };

      const start = performance.now();
      const result = MemoryContextSchema.parse(context);
      const end = performance.now();

      expect(result.relatedMemoryIds).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });

    test('should handle complex metadata efficiently', () => {
      const complexMetadata = {
        tags: Array.from({ length: 100 }, (_, i) => `tag-${i + 1}`),
        customData: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`key-${i + 1}`, `value-${i + 1}`])
        ),
        nested: {
          deep: {
            structure: {
              with: { many: { levels: true } }
            }
          }
        }
      };
      
      const context = {
        userId: mockUserId,
        type: 'environmental' as ContextType,
        name: 'Context with complex metadata',
        metadata: complexMetadata
      };

      const start = performance.now();
      const result = MemoryContextSchema.parse(context);
      const end = performance.now();

      expect(result.metadata).toEqual(complexMetadata);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});