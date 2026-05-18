import type { LAB_DATA, App } from '@homelab/shared';
import { signozClient } from '../clients/signoz-client.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { mcpClient } from '../clients/mcp-client.js';
import { getLabData } from '../mock-data.js';

const HOSTS = ['nyx', 'helios', 'aether', 'vega'];

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

// Convert Prometheus decimal ratio (0-1) to percentage (0-100)
export function prometheusRatioToPercent(value: string): number {
  const num = parseFloat(value);
  return Math.round(num * 10000) / 100;
}

// Convert bytes/sec to Mbps (1 Mbps = 125,000 bytes/sec)
export function prometheusBytesPerSecToMbps(value: string): number {
  const num = parseFloat(value);
  return Math.round((num / 125000) * 1000) / 1000;
}

// Convert Prometheus timestamp and value pairs to percentage histogram (0-100)
export function histogramFromPrometheus(values: Array<[number, string]>): number[] {
  return values
    .slice(-48) // Last 48 points (30-min buckets over 24h)
    .map(([, value]) => prometheusRatioToPercent(value));
}

// Convert Prometheus timestamp and value pairs to network throughput histogram (Mbps)
export function histogramFromPrometheusMbps(values: Array<[number, string]>): number[] {
  return values
    .slice(-48) // Last 48 points (30-min buckets over 24h)
    .map(([, value]) => prometheusBytesPerSecToMbps(value));
}

export async function transformMetrics(
  labData: LAB_DATA
): Promise<{ data: LAB_DATA; degraded: string[] }> {
  const degraded: string[] = [];
  const result = { ...labData };

  // Try to fetch and transform server metrics
  try {
    const promises = HOSTS.map(async (hostname) => {
      try {
        const cpuMetrics = await signozClient.getCpuMetrics(hostname);
        const memMetrics = await signozClient.getMemoryMetrics(hostname);
        const diskMetrics = await signozClient.getDiskMetrics(hostname);
        const temp = await signozClient.getTemperature(hostname);
        const load = await signozClient.getLoadAverage(hostname);

        return {
          hostname,
          cpu: histogramFromPrometheus(cpuMetrics),
          mem: histogramFromPrometheus(memMetrics),
          disk: histogramFromPrometheus(diskMetrics),
          temp,
          load,
        };
      } catch (error) {
        console.error(`Failed to fetch SigNoz metrics for ${hostname}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);

    results.forEach((settled, idx) => {
      if (settled.status === 'fulfilled' && settled.value) {
        const metrics = settled.value;
        const server = labData.servers.find((s) => s.id === metrics.hostname);
        if (server) {
          if (metrics.cpu.length > 0) {
            server.cpu = { ...server.cpu, hist: metrics.cpu };
          }
          if (metrics.mem.length > 0) {
            server.mem = { ...server.mem, hist: metrics.mem };
          }
          if (metrics.disk.length > 0) {
            server.disk = { ...server.disk, hist: metrics.disk };
          }
          server.temp = metrics.temp;
          server.load = metrics.load;
        }
      } else if (settled.status === 'rejected') {
        degraded.push('signoz');
      }
    });
  } catch (error) {
    console.error('Error transforming server metrics:', error);
    degraded.push('signoz');
  }

  // Try to fetch and transform gateway metrics
  try {
    const gatewayResults = await Promise.allSettled([
      ntopngClient.getWanInterfaceStats(),
      ntopngClient.getDNSStats(),
      ntopngClient.getVpnPeers(),
    ]);

    const wanStatsResult = gatewayResults[0];
    const dnsStatsResult = gatewayResults[1];
    const vpnPeersResult = gatewayResults[2];

    let hasGatewayFailure = false;
    const gatewayUpdates: Partial<typeof result.gateway> = {};

    if (wanStatsResult.status === 'fulfilled') {
      const wanStats = wanStatsResult.value;
      gatewayUpdates.pingMs = wanStats.ping;
      gatewayUpdates.jitterMs = wanStats.jitter;
      gatewayUpdates.lossPct = wanStats.loss;
      gatewayUpdates.downMbps = wanStats.downMbps;
      gatewayUpdates.upMbps = wanStats.upMbps;
    } else {
      hasGatewayFailure = true;
    }

    if (dnsStatsResult.status === 'fulfilled') {
      const dnsStats = dnsStatsResult.value;
      gatewayUpdates.dnsResolved = dnsStats.resolved;
      gatewayUpdates.dnsBlocked = dnsStats.blocked;
    } else {
      hasGatewayFailure = true;
    }

    if (vpnPeersResult.status === 'fulfilled') {
      const vpnPeers = vpnPeersResult.value;
      gatewayUpdates.vpnPeers = vpnPeers;
    } else {
      hasGatewayFailure = true;
    }

    if (Object.keys(gatewayUpdates).length > 0) {
      result.gateway = {
        ...result.gateway,
        ...gatewayUpdates,
      };
    }

    if (hasGatewayFailure) {
      degraded.push('ntopng');
    }
  } catch (error) {
    console.error('Error transforming gateway metrics:', error);
    degraded.push('ntopng');
  }

  // Try to fetch ElastiFlow data for network history
  try {
    const downHistPromises = HOSTS.map((hostname) =>
      elastiflowClient.getHostThroughput(hostname)
    );
    const downHistResults = await Promise.allSettled(downHistPromises);

    let hasFailure = false;
    HOSTS.forEach((hostname, idx) => {
      const histResult = downHistResults[idx];
      if (histResult.status === 'fulfilled' && histResult.value.length > 0) {
        const server = result.servers.find((s) => s.id === hostname);
        if (server) {
          server.net = {
            ...server.net,
            hist: histogramFromPrometheusMbps(histResult.value),
          };
        }
      } else if (histResult.status === 'rejected') {
        hasFailure = true;
      }
    });

    if (hasFailure) {
      degraded.push('elastiflow');
    }
  } catch (error) {
    console.error('Error transforming ElastiFlow metrics:', error);
    degraded.push('elastiflow');
  }

  // Try to fetch apps from phone-home MCP
  try {
    const appsData = await mcpClient.listContainers();
    if (isValidAppData(appsData)) {
      result.apps = appsData;
    } else {
      throw new Error('Invalid apps data structure from MCP');
    }
  } catch (error) {
    console.error('Error fetching apps from phone-home MCP:', error);
    degraded.push('phone-home');
  }

  // Try to fetch power and uptime
  try {
    const [powerDraw, uptime] = await Promise.all([
      signozClient.getPowerDraw(),
      signozClient.getClusterUptime(),
    ]);

    result.cluster = {
      ...result.cluster,
      powerDraw: Math.round(powerDraw),
      uptimeDays: uptime.days,
      uptimeHours: uptime.hours,
    };
  } catch (error) {
    console.error('Error transforming cluster metrics:', error);
  }

  return { data: result, degraded };
}
