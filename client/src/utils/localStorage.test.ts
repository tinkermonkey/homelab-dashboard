import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './localStorage.js';

describe('usePersistedState hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reads persisted value on init', () => {
    localStorage.setItem('key', JSON.stringify('saved'));
    const { result } = renderHook(() => usePersistedState('key', 'default'));
    expect(result.current[0]).toBe('saved');
  });

  it('falls back to default value when localStorage is empty', () => {
    const { result } = renderHook(() => usePersistedState('key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('recovers from corrupted JSON with default value', () => {
    localStorage.setItem('key', 'invalid-json{');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => usePersistedState('key', 'default'));

    expect(result.current[0]).toBe('default');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Error reading localStorage key "key"'),
      expect.any(Error)
    );

    warn.mockRestore();
  });

  it('setPersisted updates state and writes to localStorage', () => {
    const { result } = renderHook(() => usePersistedState('key', 'default'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated');
  });

  it('handles write errors gracefully', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    const { result } = renderHook(() => usePersistedState('key', 'default'));

    act(() => {
      result.current[1]('value');
    });

    expect(result.current[0]).toBe('default');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Error writing localStorage key "key"'),
      expect.any(Error)
    );

    warn.mockRestore();
    setItemSpy.mockRestore();
  });

  it('maintains separate values for different keys', () => {
    const { result: result1 } = renderHook(() => usePersistedState('key1', 'default1'));
    const { result: result2 } = renderHook(() => usePersistedState('key2', 'default2'));

    act(() => {
      result1.current[1]('value1');
    });

    act(() => {
      result2.current[1]('value2');
    });

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('value2');
    expect(JSON.parse(localStorage.getItem('key1')!)).toBe('value1');
    expect(JSON.parse(localStorage.getItem('key2')!)).toBe('value2');
  });

  it('handles various JSON-serializable types', () => {
    const testCases = [
      { value: 'string' },
      { value: 42 },
      { value: true },
      { value: null },
      { value: [1, 2, 3] },
      { value: { nested: { deep: true } } },
    ];

    testCases.forEach((testCase, i) => {
      const key = `test-${i}`;
      const { result } = renderHook(() => usePersistedState(key, testCase.value));

      act(() => {
        result.current[1](testCase.value);
      });

      expect(result.current[0]).toEqual(testCase.value);
      expect(JSON.parse(localStorage.getItem(key)!)).toEqual(testCase.value);
    });
  });
});
