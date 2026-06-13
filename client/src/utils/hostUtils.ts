import type { Server } from '@homelab/shared';
import type { StatusColor } from '@tinkermonkey/heimdall-ui';

export const ROLE_COLOR: Record<Server['role'], StatusColor> = {
  compute: 'cyan',
  storage: 'emerald',
  k8s: 'violet',
  gpu: 'amber',
};

export function cpuTone(v: number): StatusColor { return v >= 85 ? 'rose' : v >= 75 ? 'amber' : 'cyan'; }
export function memTone(v: number): StatusColor { return v >= 90 ? 'rose' : v >= 78 ? 'amber' : 'violet'; }
export function diskTone(v: number): StatusColor { return v >= 92 ? 'rose' : v >= 85 ? 'amber' : 'emerald'; }

export function getRoleColor(role: string): StatusColor {
  return ROLE_COLOR[role as Server['role']] ?? 'cyan';
}
