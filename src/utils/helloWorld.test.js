import { describe, it, expect } from 'vitest';
import { helloWorld } from './helloWorld';

describe('helloWorld function', () => {
  it('should return "Hello, World!" when called with no arguments', () => {
    const result = helloWorld();
    expect(result).toBe('Hello, World!');
  });

  it('should retnurn "Hello, john!" when called with "john"', () => {
    const result = helloWorld('john');
    expect(result).toBe('Hello, john!');
  });

  it('should be a function', () => {
    expect(typeof helloWorld).toBe('function');
  });
});
// This test suite checks the functionality of the helloWorld function.
// It verifies that the function returns the expected string and that it is indeed a function.
