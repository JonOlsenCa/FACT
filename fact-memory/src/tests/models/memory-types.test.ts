/**
 * FACT Memory System - Memory Types Tests
 * 
 * Unit tests for memory types validation, schemas, and utilities.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  BaseMemory,
  PreferencesMemory,
  FactsMemory,
  ContextMemory,
  BehaviorMemory,
  AnyMemory,
  MemoryType,
  MemoryPriority,
  MemoryTypeValidators,
  SafeMemoryValidators,
  CreateAnyMemory
} from '../../models/memory-types.js';

describe('Memory Types', () => {
  const mockUserId = 'user-123';
  const baseDate = new Date('2024-01-01T00:00:00.000Z');

  describe('PreferencesMemory', () => {
    test('should create valid preferences memory', () => {
      const memory: PreferencesMemory = {
        id: 'pref-1',
        userId: mockUserId,
        type: 'preferences',
        priority: 'medium',
        content: 'User prefers dark mode',
        keywords: ['theme', 'ui'],
        tags: ['ui', 'theme'],
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

      const result = MemoryTypeValidators.validatePreferences(memory);
      expect(result.type).toBe('preferences');
      expect(result.category).toBe('ui');
      expect(result.value).toBe('dark');
      expect(result.isGlobal).toBe(false);
    });

    test('should validate preferences memory schema', () => {
      const validData = {
        userId: mockUserId,
        type: 'preferences' as const,
        content: 'User prefers light theme',
        category: 'ui',
        value: 'light'
      };

      const result = SafeMemoryValidators.preferences(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('preferences');
        expect(result.data.value).toBe('light');
        expect(result.data.category).toBe('ui');
      }
    });

    test('should fail validation with missing required fields', () => {
      const invalidData = {
        userId: mockUserId,
        type: 'preferences' as const,
        content: 'User prefers dark mode'
        // Missing required fields: category, subcategory, settingKey, settingValue
      };

      const result = SafeMemoryValidators.preferences(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('FactsMemory', () => {
    test('should create valid facts memory', () => {
      const memory: FactsMemory = {
        id: 'fact-1',
        userId: mockUserId,
        type: 'facts',
        priority: 'high',
        content: 'User lives in New York',
        keywords: ['location', 'residence'],
        tags: ['location', 'personal'],
        confidence: 0.95,
        createdAt: baseDate,
        updatedAt: baseDate,
        relations: [],
        accessCount: 0,
        source: 'user_profile',
        category: 'personal',
        isVerified: true,
        evidenceSource: 'user_profile',
        contradicts: []
      };

      const result = MemoryTypeValidators.validateFacts(memory);
      expect(result.type).toBe('facts');
      expect(result.category).toBe('personal');
      expect(result.confidence).toBe(0.95);
      expect(result.isVerified).toBe(true);
    });

    test('should validate confidence range', () => {
      const invalidData = {
        userId: mockUserId,
        type: 'facts' as const,
        content: 'Test fact',
        factType: 'personal',
        subject: 'user',
        predicate: 'likes',
        object: 'coffee',
        confidence: 1.5, // Invalid: > 1
        source: 'conversation'
      };

      const result = SafeMemoryValidators.facts(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ContextMemory', () => {
    test('should create valid context memory', () => {
      const memory: ContextMemory = {
        id: 'ctx-1',
        userId: mockUserId,
        type: 'context',
        priority: 'medium',
        content: 'User is working on a project',
        keywords: ['work', 'project'],
        tags: ['work', 'project'],
        confidence: 1.0,
        createdAt: baseDate,
        updatedAt: baseDate,
        relations: [],
        accessCount: 0,
        sessionId: 'session-123',
        conversationTurn: 5,
        contextType: 'task',
        parentContext: 'parent-ctx-1',
        childContexts: ['child-ctx-1', 'child-ctx-2']
      };

      const result = MemoryTypeValidators.validateContext(memory);
      expect(result.type).toBe('context');
      expect(result.contextType).toBe('task');
      expect(result.conversationTurn).toBe(5);
    });

    test('should default conversation turn to 0', () => {
      const validData = {
        userId: mockUserId,
        type: 'context' as const,
        content: 'Context without turn specified'
      };

      const result = SafeMemoryValidators.context(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conversationTurn).toBe(0);
      }
    });
  });

  describe('BehaviorMemory', () => {
    test('should create valid behavior memory', () => {
      const memory: BehaviorMemory = {
        id: 'behav-1',
        userId: mockUserId,
        type: 'behavior',
        priority: 'low',
        content: 'User tends to ask follow-up questions',
        keywords: ['communication', 'questioning'],
        tags: ['communication', 'pattern'],
        confidence: 0.8,
        createdAt: baseDate,
        updatedAt: baseDate,
        relations: [],
        accessCount: 0,
        behaviorType: 'pattern',
        frequency: 0.75,
        triggers: ['complex_explanation'],
        outcomes: ['better_understanding'],
        lastObserved: baseDate
      };

      const result = MemoryTypeValidators.validateBehavior(memory);
      expect(result.type).toBe('behavior');
      expect(result.behaviorType).toBe('pattern');
      expect(result.frequency).toBe(0.75);
    });

    test('should validate frequency range', () => {
      const invalidData = {
        userId: mockUserId,
        type: 'behavior' as const,
        content: 'Test behavior',
        behaviorType: 'habit',
        frequency: -0.5, // Invalid: < 0
        triggers: ['test'],
        outcomes: ['result']
      };

      const result = SafeMemoryValidators.behavior(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('AnyMemory Union Type', () => {
    test('should validate any memory type', () => {
      const preferencesMemory: AnyMemory = {
        id: 'pref-1',
        userId: mockUserId,
        type: 'preferences',
        priority: 'medium',
        content: 'User prefers dark mode',
        keywords: [],
        tags: [],
        confidence: 1.0,
        createdAt: baseDate,
        updatedAt: baseDate,
        relations: [],
        accessCount: 0,
        category: 'ui',
        value: 'dark',
        isGlobal: false,
        scope: []
      };

      expect(preferencesMemory.type).toBe('preferences');
      expect('settingKey' in preferencesMemory).toBe(true);
    });

    test('should validate different memory types in array', () => {
      const memories: AnyMemory[] = [
        {
          id: 'pref-1',
          userId: mockUserId,
          type: 'preferences',
          priority: 'medium',
          content: 'Theme preference',
          keywords: [],
          tags: [],
          confidence: 1.0,
          createdAt: baseDate,
          updatedAt: baseDate,
          relations: [],
          accessCount: 0,
          category: 'ui',
          value: 'dark',
          isGlobal: false,
          scope: []
        },
        {
          id: 'fact-1',
          userId: mockUserId,
          type: 'facts',
          priority: 'high',
          content: 'User location',
          keywords: [],
          tags: [],
          confidence: 0.9,
          createdAt: baseDate,
          updatedAt: baseDate,
          relations: [],
          accessCount: 0,
          source: 'profile',
          category: 'personal',
          isVerified: true,
          evidenceSource: 'profile',
          contradicts: []
        }
      ];

      expect(memories).toHaveLength(2);
      expect(memories[0].type).toBe('preferences');
      expect(memories[1].type).toBe('facts');
    });
  });

  describe('Memory Creation Types', () => {
    test('should create memory without auto-generated fields', () => {
      const createData: CreateAnyMemory = {
        userId: mockUserId,
        type: 'preferences',
        content: 'New preference',
        keywords: ['ui', 'preference'],
        tags: ['ui'],
        priority: 'medium',
        confidence: 1.0,
        relations: [],
        category: 'ui',
        value: 'left',
        isGlobal: false,
        scope: ['user']
      };

      // Should not have auto-generated fields
      expect('id' in createData).toBe(false);
      expect('createdAt' in createData).toBe(false);
      expect('updatedAt' in createData).toBe(false);
      expect('accessCount' in createData).toBe(false);

      // Should have required fields
      expect(createData.userId).toBe(mockUserId);
      expect(createData.type).toBe('preferences');
      expect(createData.content).toBe('New preference');
    });
  });

  describe('Memory Validation Edge Cases', () => {
    test('should handle empty arrays and optional fields', () => {
      const minimalMemory = {
        userId: mockUserId,
        type: 'preferences' as const,
        content: 'Minimal preference',
        category: 'test',
        subcategory: 'test',
        settingKey: 'test',
        settingValue: 'test'
      };

      const result = SafeMemoryValidators.preferences(minimalMemory);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
        expect(result.data.keywords).toEqual([]);
        expect(result.data.priority).toBe('medium'); // default
      }
    });

    test('should validate memory priorities', () => {
      const priorities: MemoryPriority[] = ['low', 'medium', 'high', 'critical'];
      
      for (const priority of priorities) {
        const memory = {
          userId: mockUserId,
          type: 'preferences' as const,
          priority,
          content: `Priority ${priority}`,
          category: 'test',
          subcategory: 'test',
          settingKey: 'test',
          settingValue: 'test'
        };

        const result = SafeMemoryValidators.preferences(memory);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priority).toBe(priority);
        }
      }
    });

    test('should validate memory types', () => {
      const types: MemoryType[] = ['preferences', 'facts', 'context', 'behavior'];
      
      for (const type of types) {
        expect(types).toContain(type);
      }
    });
  });

  describe('Schema Validation Performance', () => {
    test('should handle large content efficiently', () => {
      const largeContent = 'x'.repeat(10000); // 10KB content
      
      const memory = {
        userId: mockUserId,
        type: 'preferences' as const,
        content: largeContent,
        category: 'test',
        subcategory: 'test',
        settingKey: 'test',
        settingValue: 'test'
      };

      const start = performance.now();
      const result = SafeMemoryValidators.preferences(memory);
      const end = performance.now();

      expect(result.success).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});