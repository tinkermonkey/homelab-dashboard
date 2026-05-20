import { useQuery } from '@tanstack/react-query';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA, ALERTS_DATA, Alert } from '@homelab/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface APIResponse<T> {
  data: T;
  degraded?: string[];
  source?: 'real' | 'mock';
}

export async function fetchJSON<T>(url: string): Promise<APIResponse<T>> {
  const response = await fetch(url);

  if (!response.ok && response.status !== 206) {
    let errorMessage = `API error ${response.status}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorBody = await response.json();
        if (errorBody?.error) {
          errorMessage = `API error ${response.status}: ${errorBody.error}`;
        }
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = `API error ${response.status}: ${text.slice(0, 100)}`;
        }
      }
    } catch {
      // If we can't parse the error body, use the default message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    data,
    degraded: response.status === 206 ? data?.degraded : undefined,
    source: data?.source,
  };
}

// Status data hook (2.2s polling)
export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      const response = await fetchJSON<STATUS_DATA>(`${API_BASE}/status`);
      return {
        ...response.data,
        degraded: response.degraded,
        source: response.source,
      };
    },
    refetchInterval: 2200,
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Cluster data hook (15s polling)
export function useCluster() {
  return useQuery({
    queryKey: ['cluster'],
    queryFn: async () => {
      const response = await fetchJSON<LAB_DATA>(`${API_BASE}/cluster`);
      return {
        ...response.data,
        degraded: response.degraded,
        source: response.source,
      };
    },
    refetchInterval: 15000,
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
  });
}

// Docker data hook (30s polling)
export function useDocker() {
  return useQuery({
    queryKey: ['docker'],
    queryFn: async () => {
      const response = await fetchJSON<DOCKER_DATA>(`${API_BASE}/docker`);
      return {
        ...response.data,
        degraded: response.degraded,
        source: response.source,
      };
    },
    refetchInterval: 30000,
    staleTime: 10000,
    gcTime: 15 * 60 * 1000,
  });
}

// Topology data hook (on-demand, no polling)
export function useTopology(enabled = true) {
  return useQuery({
    queryKey: ['topology'],
    queryFn: async () => {
      const response = await fetchJSON<TOPOLOGY_DATA>(`${API_BASE}/topology`);
      return {
        ...response.data,
        degraded: response.degraded,
        source: response.source,
      };
    },
    enabled,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  });
}

// Alerts hook (5s polling)
export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await fetchJSON<ALERTS_DATA>(`${API_BASE}/alerts`);

      // Runtime validation: ensure alerts is an array
      if (!Array.isArray(response.data.alerts)) {
        console.warn('Invalid alerts response: alerts field is not an array');
        return {
          alerts: [],
          source: response.source as 'alertmanager' | 'mock' | undefined,
        };
      }

      // Validate each alert has required fields
      const validAlerts = response.data.alerts.filter(
        (alert): alert is Alert =>
          typeof alert === 'object' &&
          alert !== null &&
          typeof alert.name === 'string' &&
          typeof alert.severity === 'string' &&
          typeof alert.state === 'string' &&
          typeof alert.labels === 'object' &&
          alert.labels !== null
      );

      if (validAlerts.length !== response.data.alerts.length) {
        console.warn(
          `Filtered ${response.data.alerts.length - validAlerts.length} invalid alerts`
        );
      }

      return {
        alerts: validAlerts,
        source: response.source as 'alertmanager' | 'mock' | undefined,
      };
    },
    refetchInterval: 5000,
    staleTime: 2000,
    gcTime: 5 * 60 * 1000,
  });
}
