import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as useAPIModule from './useAPI.js';
import type { Alert } from '@homelab/shared';

// Create a wrapper component for React Query
function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAPI - React Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('useAlerts hook - runtime validation', () => {
    it('returns valid alerts when response is correct', async () => {
      const validAlerts: Alert[] = [
        {
          name: 'DiskFull',
          severity: 'critical',
          state: 'active',
          labels: { host: 'nyx', disk: '/data' },
        },
        {
          name: 'MemoryLow',
          severity: 'warning',
          state: 'active',
          labels: { host: 'helios' },
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: validAlerts,
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.alerts).toHaveLength(2);
      expect(result.current.data?.alerts[0]).toEqual(validAlerts[0]);
      expect(result.current.data?.source).toBe('alertmanager');
    });

    it('filters out invalid alerts that are not objects', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'DiskFull',
              severity: 'critical',
              state: 'active',
              labels: { host: 'nyx' },
            },
            null,
            'invalid',
            123,
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toHaveLength(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 3 invalid alerts')
      );
    });

    it('filters alerts missing required string fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'DiskFull',
              severity: 'critical',
              state: 'active',
              labels: { host: 'nyx' },
            },
            {
              name: 'MemoryLow',
              // missing severity
              state: 'active',
              labels: { host: 'helios' },
            },
            {
              name: 'CPUHigh',
              severity: 'warning',
              // missing state
              labels: { host: 'aether' },
            },
            {
              // missing name
              severity: 'info',
              state: 'resolved',
              labels: { host: 'vega' },
            },
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toHaveLength(1);
      expect(result.current.data?.alerts[0].name).toBe('DiskFull');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 3 invalid alerts')
      );
    });

    it('filters alerts with non-string field values', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'DiskFull',
              severity: 'critical',
              state: 'active',
              labels: { host: 'nyx' },
            },
            {
              name: 123, // should be string
              severity: 'critical',
              state: 'active',
              labels: { host: 'nyx' },
            },
            {
              name: 'MemoryLow',
              severity: null, // should be string
              state: 'active',
              labels: { host: 'helios' },
            },
            {
              name: 'CPUHigh',
              severity: 'warning',
              state: ['active'], // should be string
              labels: { host: 'aether' },
            },
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toHaveLength(1);
      expect(result.current.data?.alerts[0].name).toBe('DiskFull');
    });

    it('filters alerts with invalid labels object', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'DiskFull',
              severity: 'critical',
              state: 'active',
              labels: { host: 'nyx' },
            },
            {
              name: 'MemoryLow',
              severity: 'warning',
              state: 'active',
              labels: null, // invalid
            },
            {
              name: 'CPUHigh',
              severity: 'warning',
              state: 'active',
              labels: 'not-an-object', // invalid
            },
            {
              name: 'NetworkDown',
              severity: 'critical',
              state: 'active',
              labels: [{ host: 'vega' }], // invalid (array)
            },
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toHaveLength(1);
      expect(result.current.data?.alerts[0].name).toBe('DiskFull');
    });

    it('handles empty alerts array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toEqual([]);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('handles alerts response where alerts field is not an array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: { error: 'malformed' }, // not an array
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid alerts response: alerts field is not an array'
      );
    });

    it('handles alerts response where alerts field is null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: null,
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid alerts response: alerts field is not an array'
      );
    });

    it('handles alerts response where alerts field is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          source: 'alertmanager',
          // alerts field is missing
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid alerts response: alerts field is not an array'
      );
    });

    it('preserves alert labels as-is when valid', async () => {
      const complexLabels = {
        host: 'nyx',
        disk: '/mnt/data',
        threshold: '90%',
        custom_field: 'custom_value',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'DiskFull',
              severity: 'critical',
              state: 'active',
              labels: complexLabels,
            },
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts[0].labels).toEqual(complexLabels);
    });

    it('handles mixed valid and invalid alerts correctly', async () => {
      const validAlert: Alert = {
        name: 'DiskFull',
        severity: 'critical',
        state: 'active',
        labels: { host: 'nyx' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            validAlert,
            { name: 'Invalid1', severity: 'critical' }, // missing state and labels
            validAlert,
            undefined,
            {
              name: 'Invalid2',
              severity: 'warning',
              state: 'active',
              labels: null,
            }, // null labels
            validAlert,
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toHaveLength(3);
      expect(result.current.data?.alerts).toEqual([validAlert, validAlert, validAlert]);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 3 invalid alerts')
      );
    });

    it('preserves source field from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'Test',
              severity: 'info',
              state: 'active',
              labels: {},
            },
          ],
          source: 'mock',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.source).toBe('mock');
    });

    it('handles source field being undefined', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'Test',
              severity: 'info',
              state: 'active',
              labels: {},
            },
          ],
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.source).toBeUndefined();
    });

    it('does not warn when all alerts are valid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            {
              name: 'Alert1',
              severity: 'critical',
              state: 'active',
              labels: { host: 'nyx' },
            },
            {
              name: 'Alert2',
              severity: 'warning',
              state: 'resolved',
              labels: { host: 'helios' },
            },
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('handles all alerts being invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          alerts: [
            { incomplete: 'alert' },
            null,
            undefined,
            [],
            {},
          ],
          source: 'alertmanager',
        }),
      });

      const { result } = renderHook(() => useAPIModule.useAlerts(), {
        wrapper: createQueryWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Filtered 5 invalid alerts')
      );
    });
  });
});
