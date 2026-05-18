export interface LAB_DATA {
  cluster: {
    powerDraw: number;
    activeAlerts: number;
    uptime: string;
  };
  servers: unknown[];
  gateway: unknown;
  apps: unknown[];
  alerts: unknown[];
}

export interface DOCKER_DATA {
  hosts: unknown[];
  containers: unknown[];
  networks: unknown[];
  volumes: unknown[];
}

export interface TOPOLOGY_DATA {
  bots: unknown[];
  mcps: unknown[];
  delegates: unknown[];
}

export interface STATUS_DATA {
  cpu: number;
  ping: number;
  downMbps: number;
  upMbps: number;
  alertCount: number;
  alertPrimary: string;
}
