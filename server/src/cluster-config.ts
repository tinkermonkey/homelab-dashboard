// Import config for its dotenv side-effect AND values: this module is imported
// (via mock-data) before index.ts imports config.js, so reading process.env
// directly here would run BEFORE dotenv loaded the .env and always fall back to
// defaults. Sourcing from `config` guarantees dotenv has populated the env.
import { config } from './config.js';

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
  name: config.clusterName,
  location: config.clusterLocation,
  domain: config.clusterDomain,
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
  {
    id: 'austins-mac-mini',
    role: 'compute',
    mark: 'MM',
    hostname: 'austins-mac-mini', // GAP: UDM client hostname for uptime match — refine if needed
    ip: '192.168.0.246',
    model: '', // GAP: no API source
    // macOS Metricbeat ships host.name as the FQDN (.local), unlike the Linux hosts.
    metricsHostname: 'austins-mac-mini.local',
  },
];
