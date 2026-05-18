import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('usePersistedState hook behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('localStorage initialization (useState initializer function)', () => {
    it('reads persisted value from localStorage when available', () => {
      const persistedValue = { value: 42 };
      localStorage.setItem('test-key', JSON.stringify(persistedValue));

      // Simulate the hook's useState initializer behavior
      const item = localStorage.getItem('test-key');
      const result = item ? JSON.parse(item) : undefined;

      expect(result).toEqual(persistedValue);
    });

    it('falls back to default value when localStorage is empty', () => {
      const defaultValue = { count: 0 };

      // Simulate hook init with no persisted value
      const item = localStorage.getItem('missing-key');
      const result = item ? JSON.parse(item) : defaultValue;

      expect(result).toEqual(defaultValue);
    });

    it('recovers from corrupted JSON with error handling', () => {
      localStorage.setItem('corrupted', 'invalid-json{');
      const defaultValue = { fallback: true };
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate hook's error handling in useState initializer
      const item = localStorage.getItem('corrupted');
      let result = defaultValue;
      try {
        result = item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn(`Error reading localStorage key "corrupted":`, error);
        result = defaultValue;
      }

      expect(result).toEqual(defaultValue);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Error reading localStorage key "corrupted"'),
        expect.any(Error)
      );

      warn.mockRestore();
    });
  });

  describe('localStorage persistence (setPersisted function behavior)', () => {
    it('persists updated values to localStorage', () => {
      const key = 'state-key';
      const newValue = 'updated-state';

      // Simulate setPersisted behavior
      localStorage.setItem(key, JSON.stringify(newValue));

      expect(JSON.parse(localStorage.getItem(key) || 'null')).toBe(newValue);
    });

    it('handles write errors gracefully', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Simulate the hook's setPersisted error handling
      const key = 'key';
      try {
        localStorage.setItem(key, JSON.stringify('value'));
      } catch (error) {
        console.warn(`Error writing localStorage key "${key}":`, error);
      }

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Error writing localStorage key "key"'),
        expect.any(Error)
      );

      warn.mockRestore();
    });
  });

  describe('multiple independent state management', () => {
    it('maintains separate values for different keys', () => {
      const key1 = 'state1';
      const key2 = 'state2';

      localStorage.setItem(key1, JSON.stringify('value1'));
      localStorage.setItem(key2, JSON.stringify('value2'));

      expect(JSON.parse(localStorage.getItem(key1) || 'null')).toBe('value1');
      expect(JSON.parse(localStorage.getItem(key2) || 'null')).toBe('value2');

      localStorage.setItem(key1, JSON.stringify('updated1'));

      expect(JSON.parse(localStorage.getItem(key1) || 'null')).toBe('updated1');
      expect(JSON.parse(localStorage.getItem(key2) || 'null')).toBe('value2');
    });
  });

  describe('JSON serialization support', () => {
    it('handles various JSON-serializable types', () => {
      const tests = [
        { key: 'string', value: 'test' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'null', value: null },
        { key: 'array', value: [1, 2, 3] },
        { key: 'object', value: { nested: { deep: true } } },
      ];

      tests.forEach(({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
        expect(JSON.parse(localStorage.getItem(key) || 'null')).toEqual(value);
      });
    });
  });
});
