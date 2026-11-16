import { describe, expect, it } from 'vitest';
import { duplicateCaptures, internalSecret, jobs, safeEqual } from './state.js';

describe('simplified transfer state', () => {
  it('starts with empty in-memory transfer collections', () => {
    expect(jobs.size).toBe(0);
    expect(duplicateCaptures.size).toBe(0);
  });

  it('compares internal service secrets safely and rejects empty or different values', () => {
    expect(safeEqual('a'.repeat(40), 'a'.repeat(40))).toBe(true);
    expect(safeEqual('a'.repeat(40), 'b'.repeat(40))).toBe(false);
    expect(safeEqual('', '')).toBe(false);
  });

  it('loads the internal secret from environment configuration', () => {
    expect(typeof internalSecret).toBe('string');
  });
});
