// Cluster data
export interface Metric {
  v: number;
  hist: number[];
}

export interface MetricWithUnits extends Metric {
  used: string;
  total: string;
  unit: 'GB' | 'TB';
}

export interface GPUMetric extends Metric {
  vram: string;
  power: string;
}

export interface Server {
  id: string;
  role: 'compute' | 'storage' | 'k8s' | 'gpu';
  mark: string;
  hostname: string;
  ip: string;
  model: string;
  uptime: string;
  status: 'ok' | 'warn' | 'err';
  cpu: Metric;
  mem: MetricWithUnits;
  disk: MetricWithUnits;
  net: Metric & { down: string; up: string; unit: 'Mbps' };
  gpu?: GPUMetric;
  temp: string;
  load: string;
  containers: number;
}

export interface Gateway {
  isp: string;
  plan: string;
  publicIp: string;
  hostname: string;
  geo: string;
  status: 'online' | 'degraded' | 'offline';
  statusFor: string;
  asn: string;
  wanIf: string;
  pingMs: number;
  pingHist: number[];
  jitterMs: number;
  lossPct: number;
  lossHist: number[];
  downMbps: number;
  upMbps: number;
  downHist: number[];
  upHist: number[];
  egressTodayGB: number;
  ingressTodayGB: number;
  egressMonthTB: number;
  blockedPct: number;
  dnsResolved: number;
  dnsBlocked: number;
  vpnPeers: number;
  vpnPeersActive: number;
}

export interface App {
  id: string;
  host: 'nyx' | 'helios' | 'aether' | 'vega';
  cat: 'media' | 'iot' | 'ai' | 'storage' | 'dev' | 'obs' | 'net';
  version: string;
  state: 'running' | 'degraded' | 'failed' | 'stopped' | 'updating';
  meta: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertState = 'active' | 'resolved';

export interface Alert {
  name: string;
  severity: AlertSeverity;
  state: AlertState;
  labels: Record<string, string>;
}

export interface Bot {
  id: string;
  label: string;
  role: string;
  avatar: string;
  status: 'ok' | 'busy' | 'idle';
  desc: string;
  model: string;
}

export interface ThreadDivider {
  kind: 'divider';
  label: string;
}

export interface ThreadMessage {
  kind: 'msg';
  who: 'user' | string;
  name?: string;
  when: string;
  body: { p: string }[];
  thinking?: { content: string };
  tool?: {
    name: string;
    status: string;
    lines: Array<{ k?: string; v: string }>;
  };
  suggestions?: { t: string }[];
}

export type ThreadItem = ThreadDivider | ThreadMessage;

export interface LAB_DATA {
  cluster: {
    name: string;
    location: string;
    domain: string;
    powerDraw: number;
    powerAvg: number;
    uptimeDays: number;
    uptimeHours: number;
    egressTodayGB: number;
    egressDelta: number;
    activeAlerts: number;
    lastSync: string;
  };
  servers: Server[];
  gateway: Gateway;
  apps: App[];
  bots: Bot[];
  threadByBot: Record<string, ThreadItem[]>;
  degraded?: string[];
  source?: 'real' | 'mock';
}

// Docker data
export interface Mount {
  type: 'bind' | 'volume';
  host?: string;
  name?: string;
  container: string;
  mode?: 'ro';
}

export interface Container {
  id: string;
  name: string;
  image: string;
  tag: string;
  state: 'running' | 'exited' | 'updating';
  health: 'healthy' | 'unhealthy' | 'degraded' | 'failed' | 'stopped' | 'pulling' | 'idle';
  uptime: string;
  ports: string[];
  mounts: Mount[];
  networks: string[];
  size: string;
  cpu: number;
  mem: number;
  gpu?: number;
}

export interface Network {
  name: string;
  driver: string;
  subnet: string;
  gateway: string;
  scope: 'local' | 'swarm';
  attached: number;
}

export interface Volume {
  name: string;
  driver: string;
  size: string;
  mount: string;
  usedBy: string[];
}

export interface DockerHost {
  id: string;
  engine: string;
  compose: string;
  containers: Container[];
  networks: Network[];
  volumes: Volume[];
}

export interface DOCKER_DATA {
  hosts: DockerHost[];
  degraded?: string[];
  source?: 'real' | 'mock';
}

// Topology data
export interface MCP {
  id: string;
  label: string;
  ver: string;
  kind: 'native' | 'remote';
  desc: string;
}

export interface TopologyBot {
  id: string;
  label: string;
  role: string;
  host: string;
  model: string;
  desc: string;
  avatar: string;
  status: 'ok' | 'busy' | 'idle';
  mcps: MCP[];
  delegates: string[];
  manages: Array<{ name: string; host: string; port: string }>;
}

export interface TOPOLOGY_DATA {
  hosts: string[];
  bots: TopologyBot[];
  degraded?: string[];
  source?: 'real' | 'mock';
}

// Status data
export interface STATUS_DATA {
  cpu: number;
  ping: number;
  downMbps: number;
  upMbps: number;
  alertCount: number;
  alertPrimary: string;
  degraded?: string[];
  source?: 'real' | 'mock';
}

// Alerts data
export interface ALERTS_DATA {
  alerts: Alert[];
  source?: 'alertmanager' | 'mock';
}
