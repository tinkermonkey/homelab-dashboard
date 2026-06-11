import type { LAB_DATA } from '@homelab/shared';
import type { FastifyBaseLogger } from 'fastify';
import { signozClient } from '../clients/signoz-client.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { metricbeatClient } from '../clients/metricbeat-client.js';
import { mcpClient } from '../clients/mcp-client.js';
import { SERVER_REGISTRY } from '../cluster-config.js';

const HOSTS_WITH_METRICS = SERVER_REGISTRY.filter(s => s.metricsHostname !== null);

function formatLastSync(): string {
  return 'just now';
}

interface UdmSubsystem {
  subsystem: string;
  status?: string;
  // WAN fields
  wan_ip?: string;
  isp_name?: string;
  asn?: number;
  gw_name?: string;
  uptime_stats?: { WAN?: { latency_average?: number } };
  // WLAN/LAN fields
  num_user?: number;
  num_disconnected?: number;
  num_ap?: number;
  num_sw?: number;
  // VPN fields
  remote_user_num_active?: number;
  remote_user_num_inactive?: number;
  // WWW fields
  latency?: number;
  // gw_system-stats fields (uptime in seconds as string)
  uptime?: string;
  cpu?: string;
  mem?: string;
}

interface UdmHealthResult {
  result?: UdmSubsystem[];
}

interface UdmClient {
  hostname?: string;
  ip?: string;
  is_wired?: boolean;
  uptime_s?: number;
}

interface UdmClientsResult {
  result?: UdmClient[];
}

function secondsToUptimeString(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export async function transformMetrics(
  labData: LAB_DATA,
  logger: FastifyBaseLogger
): Promise<{ data: LAB_DATA; degraded: string[] }> {
  const degraded: string[] = [];
  const result = { ...labData };

  // Fetch server metrics from Metricbeat (Elasticsearch)
  try {
    const promises = HOSTS_WITH_METRICS.map(async (spec) => {
      try {
        const [cpu, mem, disk, load] = await Promise.all([
          metricbeatClient.getCpuHistory(spec.metricsHostname!),
          metricbeatClient.getMemoryHistory(spec.metricsHostname!),
          metricbeatClient.getDiskHistory(spec.metricsHostname!),
          metricbeatClient.getLoadAverage(spec.metricsHostname!),
        ]);
        return { serverId: spec.id, cpu, mem, disk, load };
      } catch (error) {
        logger.error({ err: error }, `Failed to fetch metrics for ${spec.id} (${spec.metricsHostname})`);
        throw error;
      }
    });

    const results = await Promise.allSettled(promises);
    let hasFailure = false;

    results.forEach((settled) => {
      if (settled.status === 'fulfilled' && settled.value) {
        const { serverId, cpu, mem, disk, load } = settled.value;
        const server = result.servers.find((s) => s.id === serverId);
        if (server) {
          if (cpu.length > 0) server.cpu = { ...server.cpu, hist: cpu };
          if (mem.length > 0) server.mem = { ...server.mem, hist: mem };
          if (disk.length > 0) server.disk = { ...server.disk, hist: disk };
          server.load = load;
        }
      } else if (settled.status === 'rejected') {
        hasFailure = true;
      }
    });

    if (hasFailure) degraded.push('metricbeat');
  } catch (error) {
    logger.error({ err: error }, 'Error fetching server metrics');
    degraded.push('metricbeat');
  }

  // Fetch gateway throughput from ntopng
  let gatewayStats: { downMbps: number; upMbps: number; downHist: number[]; upHist: number[]; egressTodayGB: number } | null = null;
  try {
    gatewayStats = await ntopngClient.getWanInterfaceStats();
    result.gateway = {
      ...result.gateway,
      downMbps: gatewayStats.downMbps,
      upMbps: gatewayStats.upMbps,
      downHist: gatewayStats.downHist,
      upHist: gatewayStats.upHist,
      egressTodayGB: gatewayStats.egressTodayGB,
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ntopng gateway stats');
    degraded.push('ntopng');
  }

  // Fetch gateway identity, ping, and server uptime from UniFi UDM
  try {
    const [healthRaw, clientsRaw] = await Promise.all([
      mcpClient.callTool('homelab-data', 'udm_get_network_health'),
      mcpClient.callTool('homelab-data', 'udm_get_connected_clients'),
    ]);

    const subsystems: UdmSubsystem[] = (healthRaw as UdmHealthResult)?.result ?? [];
    const wan = subsystems.find(s => s.subsystem === 'wan');
    const gwStats = subsystems.find(s => s.subsystem === 'gw_system-stats');
    const vpn = subsystems.find(s => s.subsystem === 'vpn');

    if (wan) {
      result.gateway = {
        ...result.gateway,
        isp: wan.isp_name ?? result.gateway.isp,
        publicIp: wan.wan_ip ?? result.gateway.publicIp,
        asn: wan.asn != null ? String(wan.asn) : result.gateway.asn,
        hostname: wan.gw_name ?? result.gateway.hostname,
        pingMs: wan.uptime_stats?.WAN?.latency_average ?? result.gateway.pingMs,
        status: wan.status === 'ok' ? 'online' : 'degraded',
      };
    }

    if (gwStats?.uptime) {
      result.gateway = {
        ...result.gateway,
        statusFor: secondsToUptimeString(parseInt(gwStats.uptime, 10)),
        cpuPct: Math.round(parseFloat(gwStats.cpu ?? '0') * 10) / 10,
        memPct: Math.round(parseFloat(gwStats.mem ?? '0') * 10) / 10,
      };
    }

    const wlan = subsystems.find(s => s.subsystem === 'wlan');
    const lan = subsystems.find(s => s.subsystem === 'lan');
    const www = subsystems.find(s => s.subsystem === 'www');

    result.gateway = {
      ...result.gateway,
      wlanStatus: wlan ? (wlan.status === 'ok' ? 'ok' : 'error') : undefined,
      lanStatus: lan ? (lan.status === 'ok' ? 'ok' : 'error') : undefined,
      wwwLatencyMs: www?.latency,
    };

    if (vpn) {
      const active = vpn.remote_user_num_active ?? 0;
      const inactive = vpn.remote_user_num_inactive ?? 0;
      result.gateway = {
        ...result.gateway,
        vpnPeers: active + inactive,
        vpnPeersActive: active,
      };
    }

    const clients: UdmClient[] = (clientsRaw as UdmClientsResult)?.result ?? [];
    const clusterUptimes: number[] = [];
    for (const spec of SERVER_REGISTRY) {
      const client = clients.find(c => c.hostname === spec.hostname && c.is_wired);
      if (client?.uptime_s) {
        const server = result.servers.find(s => s.id === spec.id);
        if (server) {
          server.uptime = secondsToUptimeString(client.uptime_s);
          clusterUptimes.push(client.uptime_s);
        }
      }
    }

    if (clusterUptimes.length > 0) {
      const minUptime = Math.min(...clusterUptimes);
      result.cluster = {
        ...result.cluster,
        uptimeDays: Math.floor(minUptime / 86400),
        uptimeHours: Math.floor((minUptime % 86400) / 3600),
      };
    }

    result.gateway = { ...result.gateway, clientsTotal: clients.length };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching UDM network health');
    degraded.push('udm');
  }

  // Fetch per-host network throughput from ElastiFlow
  try {
    const flowResults = await Promise.allSettled(
      SERVER_REGISTRY.map((spec) => elastiflowClient.getHostThroughput(spec.id))
    );

    let hasFailure = false;
    SERVER_REGISTRY.forEach((spec, idx) => {
      const flowResult = flowResults[idx];
      if (flowResult.status === 'fulfilled' && flowResult.value.length > 0) {
        const server = result.servers.find((s) => s.id === spec.id);
        if (server) server.net = { ...server.net, hist: flowResult.value };
      } else if (flowResult.status === 'rejected') {
        hasFailure = true;
      }
    });

    if (hasFailure) degraded.push('elastiflow');
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ElastiFlow data');
    degraded.push('elastiflow');
  }

  // Fetch active alerts from SigNoz for cluster.activeAlerts
  try {
    const alerts = await signozClient.getActiveAlerts();
    result.cluster = { ...result.cluster, activeAlerts: alerts.length };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching alerts for cluster stats');
    degraded.push('signoz-alerts');
  }

  // Derive current values from histograms and compute status/containers
  result.servers = result.servers.map(server => {
    const cpuV = server.cpu.hist.length > 0 ? server.cpu.hist[server.cpu.hist.length - 1] : 0;
    const memV = server.mem.hist.length > 0 ? server.mem.hist[server.mem.hist.length - 1] : 0;
    const diskV = server.disk.hist.length > 0 ? server.disk.hist[server.disk.hist.length - 1] : 0;
    const netV = server.net.hist.length > 0 ? server.net.hist[server.net.hist.length - 1] : 0;
    const status: 'ok' | 'warn' | 'err' = memV >= 80 || cpuV >= 90 ? 'warn' : 'ok';

    return {
      ...server,
      cpu: { ...server.cpu, v: cpuV },
      mem: { ...server.mem, v: memV },
      disk: { ...server.disk, v: diskV },
      net: { ...server.net, v: netV },
      status,
      containers: 0, // GAP: no container inventory source via MCP
    };
  });

  // Sync egressTodayGB and set lastSync
  if (gatewayStats) {
    result.cluster = {
      ...result.cluster,
      egressTodayGB: gatewayStats.egressTodayGB,
    };
  }
  result.cluster = { ...result.cluster, lastSync: formatLastSync() };

  return { data: result, degraded };
}

// Utility: convert 0-1 fraction to 0-100 percentage histogram (kept for tests)
export function prometheusRatioToPercent(value: string): number {
  const num = parseFloat(value);
  return Math.round(num * 10000) / 100;
}

export function prometheusBytesPerSecToMbps(value: string): number {
  const num = parseFloat(value);
  return Math.round((num / 125000) * 1000) / 1000;
}

export function histogramFromPrometheus(values: Array<[number, string]>): number[] {
  return values.slice(-48).map(([, value]) => prometheusRatioToPercent(value));
}

export function histogramFromPrometheusMbps(values: Array<[number, string]>): number[] {
  return values.slice(-48).map(([, value]) => prometheusBytesPerSecToMbps(value));
}
