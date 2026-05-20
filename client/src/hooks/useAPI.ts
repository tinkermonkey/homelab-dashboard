import { useQuery } from '@tanstack/react-query';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA, Alert } from '@homelab/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface APIResponse<T> {
  data: T;
  degraded?: string[];
}

export async function fetchJSON<T>(url: string): Promise<APIResponse<T>> {
  const response = await fetch(url);

  if (!response.ok && response.status !== 206) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    degraded: response.status === 206 ? data.degraded : undefined,
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
      } as STATUS_DATA & { degraded?: string[] };
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
      } as LAB_DATA & { degraded?: string[] };
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
      const response = await fetch(`${API_BASE}/docker`);
      if (!response.ok && response.status !== 206) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return {
        ...data,
        degraded: response.status === 206 ? data.degraded : undefined,
        source: data.source as 'real' | 'mock',
      } as DOCKER_DATA & { degraded?: string[]; source?: 'real' | 'mock' };
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
      const response = await fetch(`${API_BASE}/topology`);
      if (!response.ok && response.status !== 206) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return {
        ...data,
        degraded: response.status === 206 ? data.degraded : undefined,
        source: data.source as 'real' | 'mock',
      } as TOPOLOGY_DATA & { degraded?: string[]; source?: 'real' | 'mock' };
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
      const response = await fetch(`${API_BASE}/alerts`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return {
        alerts: data.alerts as Alert[],
        source: data.source as string,
      };
    },
    refetchInterval: 5000,
    staleTime: 2000,
    gcTime: 5 * 60 * 1000,
  });
}
