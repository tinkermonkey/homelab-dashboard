import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedData, clearCache } from './cache.js';

describe('getCachedData', () => {
  beforeEach(() => {
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cached data when within TTL', async () => {
    const generator = vi.fn().mockResolvedValue({ value: 'test' });

    const result1 = await getCachedData('key', 10, generator);
    const result2 = await getCachedData('key', 10, generator);

    expect(result1).toEqual({ value: 'test' });
    expect(result2).toEqual({ value: 'test' });
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('regenerates data when cache expires', async () => {
    const generator = vi.fn()
      .mockResolvedValueOnce({ value: 'first' })
      .mockResolvedValueOnce({ value: 'second' });

    const result1 = await getCachedData('key', 2, generator);
    expect(result1).toEqual({ value: 'first' });

    // Advance time past TTL
    vi.advanceTimersByTime(2100);

    const result2 = await getCachedData('key', 2, generator);
    expect(result2).toEqual({ value: 'second' });
    expect(generator).toHaveBeenCalledTimes(2);
  });

  it('handles missing TTL boundary correctly', async () => {
    const generator = vi.fn().mockResolvedValue({ value: 'test' });

    await getCachedData('key', 2, generator);

    // Advance to just before TTL expires (1999ms)
    vi.advanceTimersByTime(1999);

    const result = await getCachedData('key', 2, generator);
    expect(result).toEqual({ value: 'test' });
    expect(generator).toHaveBeenCalledTimes(1);
  });

  it('immediately regenerates data exactly at TTL boundary', async () => {
    const generator = vi.fn()
      .mockResolvedValueOnce({ value: 'first' })
      .mockResolvedValueOnce({ value: 'second' });

    await getCachedData('key', 2, generator);

    // Advance exactly to TTL expiration (2000ms)
    vi.advanceTimersByTime(2000);

    const result = await getCachedData('key', 2, generator);
    expect(result).toEqual({ value: 'second' });
    expect(generator).toHaveBeenCalledTimes(2);
  });

  it('calls error handler on generator failure', async () => {
    const errorHandler = vi.fn();
    const error = new Error('Generator failed');
    const generator = vi.fn().mockRejectedValue(error);

    await expect(getCachedData('key', 5, generator, errorHandler)).rejects.toThrow('Generator failed');
    expect(errorHandler).toHaveBeenCalledWith('Cache generator error for key "key": Generator failed');
  });

  it('handles multiple independent cache keys', async () => {
    const gen1 = vi.fn().mockResolvedValue({ id: 1 });
    const gen2 = vi.fn().mockResolvedValue({ id: 2 });

    const r1 = await getCachedData('key1', 10, gen1);
    const r2 = await getCachedData('key2', 10, gen2);

    expect(r1).toEqual({ id: 1 });
    expect(r2).toEqual({ id: 2 });
    expect(gen1).toHaveBeenCalledTimes(1);
    expect(gen2).toHaveBeenCalledTimes(1);

    const r1Again = await getCachedData('key1', 10, gen1);
    const r2Again = await getCachedData('key2', 10, gen2);

    expect(r1Again).toEqual({ id: 1 });
    expect(r2Again).toEqual({ id: 2 });
    expect(gen1).toHaveBeenCalledTimes(1);
    expect(gen2).toHaveBeenCalledTimes(1);
  });

  it('prevents stale data from being returned after miss', async () => {
    const gen = vi.fn()
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 2 });

    // First call: generates
    await getCachedData('key', 1, gen);

    // Expire cache
    vi.advanceTimersByTime(1100);

    // Second call: should regenerate
    const result = await getCachedData('key', 1, gen);
    expect(result.version).toBe(2);
  });
});
