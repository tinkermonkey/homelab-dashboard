import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';
import { CLUSTER_CONFIG, SERVER_REGISTRY } from './cluster-config.js';

export function getLabData(): LAB_DATA {
  return {
    cluster: {
      name: CLUSTER_CONFIG.name,
      location: CLUSTER_CONFIG.location,
      domain: CLUSTER_CONFIG.domain,
      powerDraw: 0,   // GAP: no power monitoring API connected
      powerAvg: 0,    // GAP: no power monitoring API connected
      uptimeDays: 0,  // GAP: Metricbeat system.uptime not queried
      uptimeHours: 0, // GAP: Metricbeat system.uptime not queried
      egressTodayGB: 0,
      egressDelta: 0, // GAP: requires historical egress comparison
      activeAlerts: 0,
      lastSync: '',
    },
    servers: SERVER_REGISTRY.map(spec => ({
      id: spec.id,
      role: spec.role,
      mark: spec.mark,
      hostname: spec.hostname,
      ip: spec.ip,
      model: spec.model,
      uptime: '',  // GAP: Metricbeat system.uptime not queried
      status: 'ok' as const,
      cpu: { v: 0, hist: [] },
      mem: { v: 0, hist: [], used: '', total: '', unit: 'GB' as const },
      disk: { v: 0, hist: [], used: '', total: '', unit: 'GB' as const },
      net: { v: 0, hist: [], down: '', up: '', unit: 'Mbps' as const },
      temp: '',       // GAP: requires node_exporter hardware sensors
      load: '',
      containers: 0,
    })),
    gateway: {
      isp: '',          // GAP: no API source
      plan: '',         // GAP: no API source
      publicIp: '',     // GAP: not currently extracted from ntopng
      hostname: '',     // GAP: no dynamic source
      geo: '',          // GAP: not currently extracted from ntopng
      status: 'online' as const,
      statusFor: '',    // GAP: no dynamic source
      asn: '',          // GAP: no API source
      wanIf: '',        // GAP: no API source
      pingMs: 0,        // GAP: ntopng per-interface probe data not extracted
      pingHist: [],     // GAP: ntopng per-interface probe data not extracted
      jitterMs: 0,      // GAP: ntopng per-interface probe data not extracted
      lossPct: 0,       // GAP: ntopng per-interface probe data not extracted
      lossHist: [],     // GAP: ntopng per-interface probe data not extracted
      downMbps: 0,
      upMbps: 0,
      downHist: [],
      upHist: [],
      egressTodayGB: 0,
      ingressTodayGB: 0,  // GAP: ntopng historical aggregates not queried
      egressMonthTB: 0,   // GAP: ntopng historical aggregates not queried
      blockedPct: 0,      // GAP: Pi-hole API not connected
      dnsResolved: 0,     // GAP: Pi-hole API not connected
      dnsBlocked: 0,      // GAP: Pi-hole API not connected
      vpnPeers: 0,        // GAP: WireGuard API not connected
      vpnPeersActive: 0,  // GAP: WireGuard API not connected
    },
    apps: [],
    bots: [],
    threadByBot: {},
  };
}

export function getDockerData(): DOCKER_DATA {
  return { hosts: [] };
}

export function getTopologyData(): TOPOLOGY_DATA {
  return { hosts: [], bots: [] };
}

export function getStatusData(): STATUS_DATA {
  return {
    cpu: 0,
    ping: 0,     // GAP: no upstream source
    downMbps: 0,
    upMbps: 0,
    alertCount: 0,
    alertPrimary: '',
  };
}
