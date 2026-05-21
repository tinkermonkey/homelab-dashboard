export interface ServerSpec {
  id: string;
  role: 'compute' | 'storage' | 'k8s' | 'gpu';
  mark: string;
  hostname: string;
  ip: string;
  model: string; // GAP: no API source for hardware model
  metricsHostname: string | null; // null = no metricbeat instance
}

export const CLUSTER_CONFIG = {
  name: process.env.CLUSTER_NAME || 'asgard',
  location: process.env.CLUSTER_LOCATION || 'rack-01 · basement',
  domain: process.env.CLUSTER_DOMAIN || 'local',
};

export const SERVER_REGISTRY: ServerSpec[] = [
  {
    id: 't5610',
    role: 'compute',
    mark: 'T5',
    hostname: 't5610',
    ip: '192.168.0.117',
    model: '', // GAP: no API source
    metricsHostname: 't5610',
  },
  {
    id: 'petit-cochon',
    role: 'compute',
    mark: 'PC',
    hostname: 'petit-cochon',
    ip: '192.168.0.245',
    model: '', // GAP: no API source
    metricsHostname: 'petit-cochon',
  },
  {
    id: 'hp7052',
    role: 'k8s',
    mark: 'HP',
    hostname: 'hp7052',
    ip: '192.168.0.72',
    model: '', // GAP: no API source
    metricsHostname: 'hp7052',
  },
];
