import { describe, it, expect } from 'vitest';
import {
  prometheusRatioToPercent,
  prometheusBytesPerSecToMbps,
  histogramFromPrometheus,
  histogramFromPrometheusMbps,
} from './metrics-transformer.js';

describe('Metrics Transformer', () => {
  describe('prometheusRatioToPercent', () => {
    it('converts ratio 0.0 to 0%', () => {
      expect(prometheusRatioToPercent('0.0')).toBe(0);
    });

    it('converts ratio 1.0 to 100%', () => {
      expect(prometheusRatioToPercent('1.0')).toBe(100);
    });

    it('converts ratio 0.5 to 50%', () => {
      expect(prometheusRatioToPercent('0.5')).toBe(50);
    });

    it('converts ratio 0.25 to 25%', () => {
      expect(prometheusRatioToPercent('0.25')).toBe(25);
    });

    it('handles decimal precision', () => {
      expect(prometheusRatioToPercent('0.3333')).toBe(33.33);
    });

    it('handles very small values', () => {
      expect(prometheusRatioToPercent('0.001')).toBe(0.1);
    });

    it('handles values > 1.0 (edge case)', () => {
      expect(prometheusRatioToPercent('1.5')).toBe(150);
    });

    it('rounds to 2 decimal places', () => {
      // 0.666666... should round to 66.67%
      expect(prometheusRatioToPercent('0.6666666666')).toBe(66.67);
    });
  });

  describe('prometheusBytesPerSecToMbps', () => {
    it('converts 125000 bytes/sec to 1 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('125000')).toBe(1);
    });

    it('converts 250000 bytes/sec to 2 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('250000')).toBe(2);
    });

    it('converts 0 bytes/sec to 0 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('0')).toBe(0);
    });

    it('converts 62500 bytes/sec to 0.5 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('62500')).toBe(0.5);
    });

    it('handles fractional inputs', () => {
      expect(prometheusBytesPerSecToMbps('156250.5')).toBeCloseTo(1.25);
    });

    it('rounds to 3 decimal places', () => {
      // 125001 bytes/sec ≈ 1.0000008 Mbps
      expect(prometheusBytesPerSecToMbps('125001')).toBe(1);
    });

    it('handles large values (Gigabit network)', () => {
      // 125,000,000 bytes/sec = 1000 Mbps
      expect(prometheusBytesPerSecToMbps('125000000')).toBe(1000);
    });
  });

  describe('histogramFromPrometheus', () => {
    it('returns empty array for empty input', () => {
      const result = histogramFromPrometheus([]);
      expect(result).toEqual([]);
    });

    it('returns last 48 values from input', () => {
      const values = Array.from({ length: 100 }, (_, i) => [
        i * 1000,
        String((i + 1) / 100),
      ] as [number, string]);

      const result = histogramFromPrometheus(values);
      expect(result).toHaveLength(48);
    });

    it('converts all ratio values to percentages', () => {
      const values = [
        [0, '0.25'],
        [1000, '0.5'],
        [2000, '0.75'],
      ] as [number, string][];

      const result = histogramFromPrometheus(values);
      expect(result).toEqual([25, 50, 75]);
    });

    it('maintains chronological order', () => {
      const values = Array.from({ length: 50 }, (_, i) => [
        i * 1000,
        String(i / 50),
      ] as [number, string]);

      const result = histogramFromPrometheus(values);
      // Should be in ascending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
      }
    });
  });

  describe('histogramFromPrometheusMbps', () => {
    it('returns empty array for empty input', () => {
      const result = histogramFromPrometheusMbps([]);
      expect(result).toEqual([]);
    });

    it('converts byte rates to Mbps', () => {
      const values = [
        [0, '125000'], // 1 Mbps
        [1000, '250000'], // 2 Mbps
        [2000, '375000'], // 3 Mbps
      ] as [number, string][];

      const result = histogramFromPrometheusMbps(values);
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns last 48 values from input', () => {
      const values = Array.from({ length: 100 }, (_, i) => [
        i * 1000,
        String((i + 1) * 125000),
      ] as [number, string]);

      const result = histogramFromPrometheusMbps(values);
      expect(result).toHaveLength(48);
    });
  });

  describe('Error handling', () => {
    it('handles non-numeric string values gracefully (parseFloat returns NaN)', () => {
      const result = prometheusRatioToPercent('invalid');
      expect(isNaN(result)).toBe(true);
    });

    it('handles empty string values', () => {
      const result = prometheusRatioToPercent('');
      expect(isNaN(result)).toBe(true);
    });

    it('handles scientific notation', () => {
      expect(prometheusRatioToPercent('1e-2')).toBe(1);
      expect(prometheusBytesPerSecToMbps('1.25e5')).toBe(1);
    });
  });
});
