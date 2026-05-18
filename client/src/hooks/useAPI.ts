import { useQuery } from '@tanstack/react-query';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// Status data hook (2.2s polling)
export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: () => fetchJSON<STATUS_DATA>(`${API_BASE}/status`),
    refetchInterval: 2200,
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Cluster data hook (15s polling)
export function useCluster() {
  return useQuery({
    queryKey: ['cluster'],
    queryFn: () => fetchJSON<LAB_DATA>(`${API_BASE}/cluster`),
    refetchInterval: 15000,
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
  });
}

// Docker data hook (30s polling)
export function useDocker() {
  return useQuery({
    queryKey: ['docker'],
    queryFn: () => fetchJSON<DOCKER_DATA>(`${API_BASE}/docker`),
    refetchInterval: 30000,
    staleTime: 10000,
    gcTime: 15 * 60 * 1000,
  });
}

// Topology data hook (on-demand, no polling)
export function useTopology(enabled = true) {
  return useQuery({
    queryKey: ['topology'],
    queryFn: () => fetchJSON<TOPOLOGY_DATA>(`${API_BASE}/topology`),
    enabled,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  });
}
