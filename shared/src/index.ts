export interface LAB_DATA {
  cluster: {
    powerDraw: number;
    activeAlerts: number;
    uptime: string;
  };
  servers: any[];
  gateway: any;
  apps: any[];
  alerts: any[];
}

export interface DOCKER_DATA {
  hosts: any[];
  containers: any[];
  networks: any[];
  volumes: any[];
}

export interface TOPOLOGY_DATA {
  bots: any[];
  mcps: any[];
  delegates: any[];
}

export interface STATUS_DATA {
  cpu: number;
  ping: number;
  downMbps: number;
  upMbps: number;
  alertCount: number;
  alertPrimary: string;
}
