/**
 * FACT Memory System - Hello World Example
 * 
 * A simple example to verify the TypeScript setup and basic functionality.
 */

import type { Memory, MemoryConfig, CacheConfig } from './types/index.js';

/**
 * Hello World demonstration of the FACT Memory System
 */
export class HelloWorldMemory {
  private readonly config: MemoryConfig & { cache: CacheConfig };

  constructor() {
    // Use simple, compatible configuration for hello world
    this.config = {
      maxMemoriesPerUser: 100,
      defaultMemoryType: 'context' as const,
      enableSemanticSearch: false, // Disable for simplicity
      searchRelevanceThreshold: 0.7,
      defaultTTL: 3600,
      enableAutoExpiry: true,
      enableRelationTracking: false,
      cache: {
        ttl: 3600,
        maxSize: 100,
        usePromptCaching: false, // Disable for simplicity
        cachePrefix: 'hello-world',
        enableCompression: false,
        compressionLevel: 6
      }
    };
  }

  /**
   * Create a simple hello world memory
   */
  async createHelloMemory(userId: string): Promise<Memory> {
    const memory: Memory = {
      metadata: {
        id: this.generateUUID(),
        userId,
        type: 'context',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['hello', 'world', 'demo'],
        confidence: 1.0,
        accessCount: 0
      },
      content: 'Hello, World! This is a test memory from the FACT Memory System.',
      summary: 'A simple hello world memory for testing',
      keywords: ['hello', 'world', 'test', 'memory'],
      relations: []
    };

    return memory;
  }

  /**
   * Create a user preference memory
   */
  async createPreferenceMemory(userId: string, preference: string, value: string): Promise<Memory> {
    const memory: Memory = {
      metadata: {
        id: this.generateUUID(),
        userId,
        type: 'preferences',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['preference', 'user-setting'],
        confidence: 1.0,
        accessCount: 0
      },
      content: `User preference: ${preference} = ${value}`,
      summary: `Preference setting for ${preference}`,
      keywords: ['preference', preference, value],
      relations: []
    };

    return memory;
  }

  /**
   * Demonstrate memory creation and basic operations
   */
  async demonstrateBasicOperations(): Promise<{
    helloMemory: Memory;
    preferenceMemory: Memory;
    summary: string;
  }> {
    const userId = 'demo-user-123';
    
    // Create hello world memory
    const helloMemory = await this.createHelloMemory(userId);
    
    // Create a preference memory
    const preferenceMemory = await this.createPreferenceMemory(
      userId, 
      'theme', 
      'dark'
    );

    const summary = `
FACT Memory System - Hello World Demo
====================================

Successfully created 2 memories for user: ${userId}

1. Hello World Memory:
   - ID: ${helloMemory.metadata.id}
   - Type: ${helloMemory.metadata.type}
   - Content: ${helloMemory.content}
   - Keywords: ${helloMemory.keywords.join(', ')}

2. Preference Memory:
   - ID: ${preferenceMemory.metadata.id}
   - Type: ${preferenceMemory.metadata.type}
   - Content: ${preferenceMemory.content}
   - Keywords: ${preferenceMemory.keywords.join(', ')}

Configuration:
- Max memories per user: ${this.config.maxMemoriesPerUser}
- Default memory type: ${this.config.defaultMemoryType}
- Semantic search enabled: ${this.config.enableSemanticSearch}
- Cache TTL: ${this.config.cache.ttl} seconds
- Cache prefix: ${this.config.cache.cachePrefix}

Next steps:
- Install dependencies: npm install
- Build project: npm run build
- Run tests: npm test
- Start development: npm run dev
    `;

    return {
      helloMemory,
      preferenceMemory,
      summary
    };
  }

  /**
   * Simple UUID generator for demo purposes
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get configuration information
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Test type validation
   */
  async testTypes(): Promise<boolean> {
    try {
      const memory = await this.createHelloMemory('test-user');
      
      // Test that memory has all required properties
      const requiredMetadataFields = [
        'id', 'userId', 'type', 'priority', 'createdAt', 
        'updatedAt', 'tags', 'confidence', 'accessCount'
      ];
      
      const requiredMemoryFields = [
        'metadata', 'content', 'keywords', 'relations'
      ];

      // Check metadata fields
      for (const field of requiredMetadataFields) {
        if (!(field in memory.metadata)) {
          console.error(`Missing metadata field: ${field}`);
          return false;
        }
      }

      // Check memory fields  
      for (const field of requiredMemoryFields) {
        if (!(field in memory)) {
          console.error(`Missing memory field: ${field}`);
          return false;
        }
      }

      // Check types
      if (typeof memory.metadata.id !== 'string') {
        console.error('Memory ID should be string');
        return false;
      }

      if (typeof memory.content !== 'string') {
        console.error('Memory content should be string');
        return false;
      }

      if (!Array.isArray(memory.keywords)) {
        console.error('Memory keywords should be array');
        return false;
      }

      console.log('✅ All type validations passed!');
      return true;
    } catch (error) {
      console.error('Type validation failed:', error);
      return false;
    }
  }
}

/**
 * Main function to run the hello world demo
 */
export async function runHelloWorldDemo(): Promise<void> {
  console.log('🚀 Starting FACT Memory System Hello World Demo...\n');
  
  try {
    const helloWorld = new HelloWorldMemory();
    
    // Test types
    console.log('📋 Testing type definitions...');
    const typesValid = await helloWorld.testTypes();
    
    if (!typesValid) {
      console.error('❌ Type validation failed');
      return;
    }
    
    // Run basic operations demo
    console.log('\n📝 Running basic operations demo...');
    const result = await helloWorld.demonstrateBasicOperations();
    
    console.log(result.summary);
    
    console.log('✅ Hello World demo completed successfully!');
    console.log('\n🎯 The FACT Memory System TypeScript setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Hello World demo failed:', error);
    throw error;
  }
}

// HelloWorldMemory is already exported above