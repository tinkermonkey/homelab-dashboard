import type { LAB_DATA, App, Bot, TopologyBot } from '@homelab/shared';
import type { FastifyBaseLogger } from 'fastify';
import { signozClient } from '../clients/signoz-client.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { metricbeatClient } from '../clients/metricbeat-client.js';
import { mcpClient } from '../clients/mcp-client.js';
import { SERVER_REGISTRY } from '../cluster-config.js';

const HOSTS_WITH_METRICS = SERVER_REGISTRY.filter(s => s.metricsHostname !== null);

function isValidAppData(data: unknown): data is App[] {
  if (!Array.isArray(data)) return false;
  return data.every((app: unknown) => {
    if (!app || typeof app !== 'object') return false;
    const a = app as Record<string, unknown>;
    return typeof a.id === 'string' &&
           typeof a.host === 'string' &&
           typeof a.cat === 'string' &&
           typeof a.version === 'string' &&
           typeof a.state === 'string' &&
           typeof a.meta === 'string';
  });
}

function isTopologyBotArray(data: unknown): data is { bots: TopologyBot[] } {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.bots) && obj.bots.every((bot: unknown) => {
    if (!bot || typeof bot !== 'object') return false;
    const b = bot as Record<string, unknown>;
    return typeof b.id === 'string' &&
           typeof b.label === 'string' &&
           typeof b.role === 'string' &&
           typeof b.avatar === 'string';
  });
}

function mapTopologyBotToBot(tb: TopologyBot): Bot {
  return {
    id: tb.id,
    label: tb.label,
    role: tb.role,
    avatar: tb.avatar,
    status: tb.status,
    desc: tb.desc,
    model: tb.model,
  };
}

function formatLastSync(): string {
  return 'just now';
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

  // Fetch gateway metrics from ntopng
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

  // Fetch apps from phone-home MCP
  try {
    const appsData = await mcpClient.listContainers();
    if (isValidAppData(appsData)) {
      result.apps = appsData;
    } else {
      throw new Error('Invalid Docker data structure from MCP');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error fetching apps from phone-home MCP');
    degraded.push('phone-home');
  }

  // Fetch bots from phone-home MCP
  try {
    const topologyData = await mcpClient.getTopologyData();
    if (isTopologyBotArray(topologyData)) {
      result.bots = topologyData.bots.map(mapTopologyBotToBot);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error fetching bots from phone-home MCP');
  }

  // Fetch active alerts from SigNoz for cluster.activeAlerts
  try {
    const alerts = await signozClient.getActiveAlerts();
    result.cluster = { ...result.cluster, activeAlerts: alerts.length };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching alerts for cluster stats');
  }

  // Derive current values from histograms and compute status/containers
  result.servers = result.servers.map(server => {
    const cpuV = server.cpu.hist.length > 0 ? server.cpu.hist[server.cpu.hist.length - 1] : 0;
    const memV = server.mem.hist.length > 0 ? server.mem.hist[server.mem.hist.length - 1] : 0;
    const diskV = server.disk.hist.length > 0 ? server.disk.hist[server.disk.hist.length - 1] : 0;
    const netV = server.net.hist.length > 0 ? server.net.hist[server.net.hist.length - 1] : 0;
    const containers = result.apps.filter(a => a.host === server.id).length;
    const status: 'ok' | 'warn' | 'err' = memV >= 80 || cpuV >= 90 ? 'warn' : 'ok';

    return {
      ...server,
      cpu: { ...server.cpu, v: cpuV },
      mem: { ...server.mem, v: memV },
      disk: { ...server.disk, v: diskV },
      net: { ...server.net, v: netV },
      status,
      containers,
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
