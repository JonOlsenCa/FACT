/**
 * Basic test for the FACT Memory System setup
 */

import { describe, it, expect } from 'vitest';
import { HelloWorldMemory, runHelloWorldDemo } from '../hello-world.js';

describe('FACT Memory System - Hello World', () => {
  it('should create a HelloWorldMemory instance', () => {
    const memory = new HelloWorldMemory();
    expect(memory).toBeDefined();
  });

  it('should run the hello world demo without errors', async () => {
    // This is a basic smoke test - just ensure the demo runs
    await expect(runHelloWorldDemo()).resolves.not.toThrow();
  });

  it('should create hello world memory', async () => {
    const memory = new HelloWorldMemory();
    const testMemory = await memory.createHelloMemory('test-user');
    
    expect(testMemory.content).toBe('Hello, World! This is a test memory from the FACT Memory System.');
    expect(testMemory.metadata.userId).toBe('test-user');
    expect(testMemory.metadata.type).toBe('context');
    expect(testMemory.metadata.id).toBeDefined();
    expect(testMemory.metadata.createdAt).toBeInstanceOf(Date);
  });

  it('should create preference memory', async () => {
    const memory = new HelloWorldMemory();
    const testMemory = await memory.createPreferenceMemory('test-user', 'theme', 'dark');
    
    expect(testMemory.content).toBe('User preference: theme = dark');
    expect(testMemory.metadata.userId).toBe('test-user');
    expect(testMemory.metadata.type).toBe('preferences');
    expect(testMemory.metadata.id).toBeDefined();
    expect(testMemory.keywords).toContain('theme');
    expect(testMemory.keywords).toContain('dark');
  });
});