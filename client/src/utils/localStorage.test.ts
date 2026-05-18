import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('localStorage utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('JSON serialization compatibility', () => {
    it('stores and retrieves string values', () => {
      const value = 'test-string';
      localStorage.setItem('key', JSON.stringify(value));
      expect(JSON.parse(localStorage.getItem('key') || 'null')).toBe(value);
    });

    it('stores and retrieves numeric values', () => {
      const value = 42;
      localStorage.setItem('key', JSON.stringify(value));
      expect(JSON.parse(localStorage.getItem('key') || 'null')).toBe(value);
    });

    it('stores and retrieves boolean values', () => {
      localStorage.setItem('key', JSON.stringify(true));
      expect(JSON.parse(localStorage.getItem('key') || 'null')).toBe(true);

      localStorage.setItem('key', JSON.stringify(false));
      expect(JSON.parse(localStorage.getItem('key') || 'null')).toBe(false);
    });

    it('stores and retrieves null values', () => {
      localStorage.setItem('key', JSON.stringify(null));
      expect(JSON.parse(localStorage.getItem('key') || 'undefined')).toBeNull();
    });

    it('stores and retrieves objects', () => {
      const obj = { id: 1, name: 'test' };
      localStorage.setItem('key', JSON.stringify(obj));
      expect(JSON.parse(localStorage.getItem('key') || '{}')).toEqual(obj);
    });

    it('stores and retrieves arrays', () => {
      const arr = [1, 2, 3];
      localStorage.setItem('key', JSON.stringify(arr));
      expect(JSON.parse(localStorage.getItem('key') || '[]')).toEqual(arr);
    });

    it('handles special characters in strings', () => {
      const special = 'hello\n\t"world"';
      localStorage.setItem('key', JSON.stringify(special));
      expect(JSON.parse(localStorage.getItem('key') || '')).toBe(special);
    });
  });

  describe('localStorage error scenarios', () => {
    it('returns null for non-existent keys', () => {
      expect(localStorage.getItem('nonexistent')).toBeNull();
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('key', 'invalid-json{');
      const value = localStorage.getItem('key');
      expect(() => JSON.parse(value || 'null')).toThrow();
    });

    it('handles empty localStorage', () => {
      localStorage.clear();
      expect(localStorage.length).toBe(0);
    });

    it('overwrites existing values', () => {
      localStorage.setItem('key', JSON.stringify('first'));
      expect(JSON.parse(localStorage.getItem('key') || 'null')).toBe('first');

      localStorage.setItem('key', JSON.stringify('second'));
      expect(JSON.parse(localStorage.getItem('key') || 'null')).toBe('second');
    });
  });

  describe('independent keys', () => {
    it('maintains separate values for different keys', () => {
      localStorage.setItem('key1', JSON.stringify('value1'));
      localStorage.setItem('key2', JSON.stringify('value2'));

      expect(JSON.parse(localStorage.getItem('key1') || 'null')).toBe('value1');
      expect(JSON.parse(localStorage.getItem('key2') || 'null')).toBe('value2');
    });

    it('updating one key does not affect others', () => {
      localStorage.setItem('key1', JSON.stringify('initial1'));
      localStorage.setItem('key2', JSON.stringify('initial2'));

      localStorage.setItem('key1', JSON.stringify('updated1'));

      expect(JSON.parse(localStorage.getItem('key1') || 'null')).toBe('updated1');
      expect(JSON.parse(localStorage.getItem('key2') || 'null')).toBe('initial2');
    });

    it('clearing one key does not affect others', () => {
      localStorage.setItem('key1', JSON.stringify('value1'));
      localStorage.setItem('key2', JSON.stringify('value2'));

      localStorage.removeItem('key1');

      expect(localStorage.getItem('key1')).toBeNull();
      expect(JSON.parse(localStorage.getItem('key2') || 'null')).toBe('value2');
    });
  });

  describe('localStorage API contract', () => {
    it('getItem returns null for missing keys', () => {
      expect(localStorage.getItem('missing')).toBeNull();
    });

    it('setItem creates and updates items', () => {
      localStorage.setItem('key', 'value');
      expect(localStorage.getItem('key')).toBe('value');
    });

    it('removeItem deletes items', () => {
      localStorage.setItem('key', 'value');
      localStorage.removeItem('key');
      expect(localStorage.getItem('key')).toBeNull();
    });

    it('clear removes all items', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.clear();
      expect(localStorage.length).toBe(0);
    });

    it('length property reflects number of items', () => {
      localStorage.clear();
      expect(localStorage.length).toBe(0);

      localStorage.setItem('key1', 'value1');
      expect(localStorage.length).toBe(1);

      localStorage.setItem('key2', 'value2');
      expect(localStorage.length).toBe(2);

      localStorage.removeItem('key1');
      expect(localStorage.length).toBe(1);
    });
  });
});
