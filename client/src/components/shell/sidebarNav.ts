import type { IconName } from '../../utils/icons';

export interface NavChild {
  id: string;
  label: string;
  count?: string;
}

export interface NavEntry {
  id: string;
  label: string;
  icon: IconName;
  count?: string;
  children?: NavChild[];
}

export const NAV_TREE: NavEntry[] = [
  { id: 'overview',   label: 'Overview',      icon: 'dashboard' },
  { id: 'servers',    label: 'Servers',        icon: 'cpu' },
  { id: 'containers', label: 'Containers',     icon: 'layers',   children: [
    { id: 'containers/list',     label: 'Containers' },
    { id: 'containers/networks', label: 'Networks' },
    { id: 'containers/volumes',  label: 'Volumes' },
  ]},
  { id: 'network',    label: 'Network',        icon: 'network' },
  { id: 'apps',       label: 'Applications',   icon: 'workflow' },
  { id: 'storage',    label: 'Storage',        icon: 'database' },
  { id: 'bots',       label: 'Bots',           icon: 'bot' },
  { id: 'topology',   label: 'Topology',       icon: 'graph' },
  { id: 'logs',       label: 'Logs',           icon: 'history' },
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
