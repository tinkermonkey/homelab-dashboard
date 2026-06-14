import type { IconName } from '@tinkermonkey/heimdall-ui';

export interface NavChild {
  id: string;
  label: string;
  count?: number;
}

export interface NavEntry {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
  children?: NavChild[];
}

export const NAV_TREE: NavEntry[] = [
  { id: 'overview',   label: 'Overview',      icon: 'dashboard' },
  { id: 'servers',    label: 'Servers',        icon: 'component' },
  { id: 'containers', label: 'Containers',     icon: 'layout' },
  { id: 'network',    label: 'Network',        icon: 'link' },
  { id: 'apps',       label: 'Applications',   icon: 'pipeline' },
  { id: 'storage',    label: 'Storage',        icon: 'data' },
  { id: 'bots',       label: 'Bots',           icon: 'bot' },
  { id: 'topology',   label: 'Topology',       icon: 'graph' },
  { id: 'logs',       label: 'Logs',           icon: 'clock' },
  { id: 'settings',   label: 'Configuration',  icon: 'settings' },
];

export const NAV_ID_TO_PATH: Record<string, string> = {
  overview:   '/cluster/overview',
  servers:    '/cluster/servers',
  containers: '/cluster/containers',
  'containers/list':     '/cluster/containers',
  'containers/networks': '/cluster/containers',
  'containers/volumes':  '/cluster/containers',
  network:    '/cluster/network',
  apps:       '/cluster/applications',
  storage:    '/cluster/storage',
  bots:       '/cluster/bots',
  topology:   '/cluster/topology',
  logs:       '/cluster/logs',
  settings:   '/cluster/configuration',
};

// Derive reverse mapping from top-level IDs only so child IDs
// (which share paths with their parents) don't overwrite the parent entry.
export const PATH_TO_NAV_ID: Record<string, string> = Object.fromEntries(
  Object.entries(NAV_ID_TO_PATH)
    .filter(([id]) => !id.includes('/'))
    .map(([id, path]) => [path, id])
);
