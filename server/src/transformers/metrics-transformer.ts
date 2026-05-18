import type { LAB_DATA } from '@homelab/shared';
import { signozClient } from '../clients/signoz-client.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { getLabData } from '../mock-data.js';

const HOSTS = ['nyx', 'helios', 'aether', 'vega'];

// Convert Prometheus values to percentage (0-100)
function prometheusValueToPercent(value: string): number {
  const num = parseFloat(value);
  return Math.round(num * 100) / 100;
}

// Convert Prometheus timestamp and value pairs to histogram
function histogramFromPrometheus(values: Array<[number, string]>): number[] {
  return values
    .slice(-48) // Last 48 points (30-min buckets over 24h)
    .map(([, value]) => prometheusValueToPercent(value));
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
    const [wanStats, dnsStats, vpnPeers] = await Promise.all([
      ntopngClient.getWanInterfaceStats(),
      ntopngClient.getDNSStats(),
      ntopngClient.getVpnPeers(),
    ]);

    result.gateway = {
      ...result.gateway,
      pingMs: wanStats.ping,
      jitterMs: wanStats.jitter,
      lossPct: wanStats.loss,
      dnsResolved: dnsStats.resolved,
      dnsBlocked: dnsStats.blocked,
      vpnPeers,
      downMbps: wanStats.downMbps,
      upMbps: wanStats.upMbps,
    };
  } catch (error) {
    console.error('Error transforming gateway metrics:', error);
    degraded.push('ntopng');
  }

  // Try to fetch ElastiFlow data for network history
  try {
    const downHistPromises = HOSTS.map((hostname) =>
      elastiflowClient.getHostThroughput(hostname)
    );
    const downHists = await Promise.all(downHistPromises);

    HOSTS.forEach((hostname, idx) => {
      const server = result.servers.find((s) => s.id === hostname);
      if (server && downHists[idx].length > 0) {
        server.net = {
          ...server.net,
          hist: histogramFromPrometheus(downHists[idx]),
        };
      }
    });
  } catch (error) {
    console.error('Error transforming ElastiFlow metrics:', error);
    degraded.push('elastiflow');
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
