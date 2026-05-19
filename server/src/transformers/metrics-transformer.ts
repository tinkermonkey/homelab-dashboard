import type { LAB_DATA, App } from '@homelab/shared';
import { signozClient } from '../clients/signoz-client.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { metricbeatClient } from '../clients/metricbeat-client.js';
import { mcpClient } from '../clients/mcp-client.js';

// Maps dashboard server IDs to actual OS hostnames reported by metricbeat
const METRICS_HOSTNAME: Record<string, string> = {
  nyx: 't5610',
  helios: 'petit-cochon',
  aether: 'hp7052',
  // vega has no metricbeat instance
};

const HOSTS = Object.keys(METRICS_HOSTNAME);

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

export async function transformMetrics(
  labData: LAB_DATA
): Promise<{ data: LAB_DATA; degraded: string[] }> {
  const degraded: string[] = [];
  const result = { ...labData };

  // Fetch server metrics from Metricbeat (Elasticsearch)
  try {
    const promises = HOSTS.map(async (serverId) => {
      const metricsHostname = METRICS_HOSTNAME[serverId];
      try {
        const [cpu, mem, disk, load] = await Promise.all([
          metricbeatClient.getCpuHistory(metricsHostname),
          metricbeatClient.getMemoryHistory(metricsHostname),
          metricbeatClient.getDiskHistory(metricsHostname),
          metricbeatClient.getLoadAverage(metricsHostname),
        ]);
        return { serverId, cpu, mem, disk, load };
      } catch (error) {
        console.error(`Failed to fetch metrics for ${serverId} (${metricsHostname}):`, error);
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
    console.error('Error fetching server metrics:', error);
    degraded.push('metricbeat');
  }

  // Fetch gateway metrics from ntopng
  try {
    const stats = await ntopngClient.getWanInterfaceStats();
    result.gateway = {
      ...result.gateway,
      downMbps: stats.downMbps,
      upMbps: stats.upMbps,
      downHist: stats.downHist,
      upHist: stats.upHist,
    };
  } catch (error) {
    console.error('Error fetching ntopng gateway stats:', error);
    degraded.push('ntopng');
  }

  // Fetch per-host network throughput from ElastiFlow
  try {
    const flowResults = await Promise.allSettled(
      HOSTS.map((serverId) => elastiflowClient.getHostThroughput(serverId))
    );

    let hasFailure = false;
    HOSTS.forEach((serverId, idx) => {
      const result_ = flowResults[idx];
      if (result_.status === 'fulfilled' && result_.value.length > 0) {
        const server = result.servers.find((s) => s.id === serverId);
        if (server) server.net = { ...server.net, hist: result_.value };
      } else if (result_.status === 'rejected') {
        hasFailure = true;
      }
    });

    if (hasFailure) degraded.push('elastiflow');
  } catch (error) {
    console.error('Error fetching ElastiFlow data:', error);
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
    console.error('Error fetching apps from phone-home MCP:', error);
    degraded.push('phone-home');
  }

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
