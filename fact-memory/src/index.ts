/**
 * FACT Memory System - Main Entry Point
 * 
 * A comprehensive memory management system that implements Mem0-inspired capabilities
 * using prompt caching techniques instead of vector databases.
 * 
 * @author rUv
 * @version 1.0.0
 */

// Types (export first to avoid circular dependencies)
export type {
  Memory,
  MemoryType,
  MemoryMetadata,
  MemoryQuery,
  MemorySearchResult,
  MemoryConfig,
  CacheConfig
} from './types/index.js';

// Hello World example
export { HelloWorldMemory, runHelloWorldDemo } from './hello-world.js';

// Core components (commented out for now due to compilation issues)
// export { MemoryManager } from './core/memory-manager.js';
// export { MemoryStore } from './core/memory-store.js';
// export { SearchEngine } from './core/search-engine.js';
// export { CacheIntegration } from './core/cache-integration.js';

// TODO: Add these exports when modules are implemented
// export { MemoryModel } from './models/memory-model.js';
// export { UserMemoryModel } from './models/user-memory-model.js';
// export { PreferenceMemoryModel } from './models/preference-memory-model.js';
// export { FactMemoryModel } from './models/fact-memory-model.js';
// export { ContextMemoryModel } from './models/context-memory-model.js';
// export { BehaviorMemoryModel } from './models/behavior-memory-model.js';

// export { MCPServer } from './mcp/server.js';
// export { MCPClient } from './mcp/client.js';

// export { MemoryUtils } from './utils/memory-utils.js';
// export { ValidationUtils } from './utils/validation-utils.js';
// export { CacheUtils } from './utils/cache-utils.js';
// export { SearchUtils } from './utils/search-utils.js';

// Version information
export const VERSION = '1.0.0';
export const MEMORY_SYSTEM_NAME = 'FACT Memory System';

/**
 * Default configuration for the FACT Memory System
 */
export const DEFAULT_CONFIG = {
  cache: {
    ttl: 3600, // 1 hour
    maxSize: 1000, // Max number of memories in cache
    usePromptCaching: true,
    cachePrefix: 'fact-memory'
  },
  memory: {
    maxMemoriesPerUser: 10000,
    defaultMemoryType: 'context' as const,
    enableSemanticSearch: true,
    searchRelevanceThreshold: 0.7
  }
} as const;

// TODO: Add initialization functions after fixing compilation issues
// These will be implemented in subsequent tasks

/**
 * Placeholder for memory system initialization
 * Will be implemented after core modules are properly compiled
 */
export function getMemorySystemInfo(): {
  version: string;
  name: string;
  status: string;
} {
  return {
    version: VERSION,
    name: MEMORY_SYSTEM_NAME,
    status: 'Development - Core modules being implemented'
  };
}