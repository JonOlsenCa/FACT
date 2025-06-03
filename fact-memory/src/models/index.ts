/**
 * FACT Memory System - Models Index
 * 
 * Main export file for all memory system models, types, and utilities.
 */

// Memory Types
export * from './memory-types.js';
export type {
  BaseMemory,
  PreferencesMemory,
  FactsMemory,
  ContextMemory,
  BehaviorMemory,
  AnyMemory,
  MemoryType,
  MemoryPriority,
  CreateAnyMemory
} from './memory-types.js';

// Memory Entry
export * from './memory-entry.js';
export type {
  MemoryEntry,
  MemoryEntryStatus,
  MemoryAccessInfo,
  CreateMemoryEntry,
  UpdateMemoryEntry
} from './memory-entry.js';

// Memory Context
export * from './memory-context.js';
export type {
  MemoryContext,
  ContextType,
  ContextScope,
  ContextPriority,
  CreateMemoryContext,
  UpdateMemoryContext,
  MemoryContextQuery,
  MemoryContextSearchResult
} from './memory-context.js';

// Re-export validators for convenience
export {
  MemoryTypeValidators,
  SafeMemoryValidators
} from './memory-types.js';

export {
  MemoryEntryValidators,
  SafeMemoryEntryValidators,
  MemoryEntryUtils
} from './memory-entry.js';

export {
  MemoryContextValidators,
  SafeMemoryContextValidators,
  MemoryContextUtils
} from './memory-context.js';

// Utility type for all model schemas
export type MemoryModels = {
  memory: import('./memory-types.js').AnyMemory;
  entry: import('./memory-entry.js').MemoryEntry;
  context: import('./memory-context.js').MemoryContext;
};

// Version information
export const MEMORY_MODELS_VERSION = '1.0.0';