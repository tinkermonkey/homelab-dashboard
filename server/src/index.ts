import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LAB_DATA, STATUS_DATA } from '@homelab/shared';
import { getLabData } from './mock-data.js';
import { config } from './config.js';
import { getCachedData, peekCache } from './cache.js';
import { transformMetrics } from './transformers/metrics-transformer.js';
import { transformDockerData, transformTopologyData } from './transformers/mcp-transformer.js';
import { transformNetworkData } from './transformers/network-transformer.js';
import { signozClient } from './clients/signoz-client.js';
import { ntopngClient } from './clients/ntopng-client.js';
import { mcpClient } from './clients/mcp-client.js';
import { metricbeatClient } from './clients/metricbeat-client.js';
import { SERVER_REGISTRY } from './cluster-config.js';
import type { LogEntryDTO } from '@homelab/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map a SigNoz/OTEL severity string to the package LogStream level vocabulary.
function normalizeLogLevel(severity?: string | null): LogEntryDTO['level'] {
  const s = (severity ?? '').toLowerCase();
  if (s.startsWith('err') || s === 'fatal' || s === 'critical') return 'ERROR';
  if (s.startsWith('warn')) return 'WARN';
  if (s.startsWith('debug') || s === 'trace') return 'DEBUG';
  return 'INFO';
}

export async function registerRoutes(app: FastifyInstance) {
  // GET /api/status (2.2s cadence, 2s cache)
  app.get('/api/status', async (request, reply) => {
    try {
      const data = await getCachedData('status', 2, async () => {
        const degraded: string[] = [];
        let downMbps = 0;
        let upMbps = 0;
        let alertCount = 0;
        let alertPrimary = '';

        try {
          const stats = await ntopngClient.getWanInterfaceStats();
          downMbps = stats.downMbps;
          upMbps = stats.upMbps;
        } catch (err) {
          app.log.error(`ntopng stats unavailable: ${err instanceof Error ? err.message : String(err)}`);
          degraded.push('ntopng');
        }

        try {
          const alerts = await signozClient.getActiveAlerts();
          alertCount = alerts.length;
          alertPrimary = alerts[0]?.name ?? '';
        } catch (err) {
          app.log.error(`signoz alerts unavailable: ${err instanceof Error ? err.message : String(err)}`);
          degraded.push('signoz');
        }

        // Ping latency from UDM Pro WAN monitoring (uptime_stats.WAN.latency_average)
        let ping = 0;
        try {
          const raw = await mcpClient.callTool('udm_get_network_health') as {
            result?: Array<{ subsystem: string; uptime_stats?: { WAN?: { latency_average?: number } } }>;
          };
          const wan = (raw?.result ?? []).find(s => s.subsystem === 'wan');
          ping = wan?.uptime_stats?.WAN?.latency_average ?? 0;
        } catch (err) {
          app.log.error(`udm network health unavailable: ${err instanceof Error ? err.message : String(err)}`);
          degraded.push('udm');
        }

        // Derive CPU from cluster cache if warm; otherwise 0
        const clusterCache = peekCache<LAB_DATA & { degraded?: string[] }>('cluster');
        const cpuValues = (clusterCache?.servers ?? []).map(s => s.cpu.v).filter(v => v > 0);
        const cpu = cpuValues.length > 0
          ? Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length)
          : 0;

        return {
          cpu,
          ping,
          downMbps,
          upMbps,
          alertCount,
          alertPrimary,
          degraded,
          source: 'real',
        } satisfies STATUS_DATA;
      }, (msg) => app.log.error(msg));
      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch status: ${message}`);
      reply.status(500).send({ error: 'Failed to fetch status' });
    }
  });

  // GET /api/cluster (15s cadence, 10s cache) - with Promise.allSettled fan-out
  app.get('/api/cluster', async (request, reply) => {
    try {
      const data = await getCachedData('cluster', 10, async () => {
        const baseData = getLabData();
        const { data: transformedData, degraded } = await transformMetrics(baseData, app.log);

        return {
          ...transformedData,
          degraded,
        };
      }, (msg) => app.log.error(msg));

      if (data.degraded && data.degraded.length > 0) {
        reply.status(206);
      }

      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch cluster data: ${message}`);
      reply.status(500).send({ error: 'Failed to fetch cluster data' });
    }
  });

  // GET /api/docker (30s cadence, 20s cache)
  app.get('/api/docker', async (request, reply) => {
    try {
      const data = await getCachedData('docker', 20, async () => {
        const { data: dockerData, degraded, source } = await transformDockerData(app.log);
        return {
          ...dockerData,
          degraded,
          source,
        };
      }, (msg) => app.log.error(msg));

      if (data.degraded && data.degraded.length > 0) {
        reply.status(206);
      }

      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch docker data: ${message}`);
      reply.status(500).send({ error: 'Failed to fetch docker data' });
    }
  });

  // GET /api/topology (on-demand, 60s cache)
  app.get('/api/topology', async (request, reply) => {
    try {
      const data = await getCachedData('topology', 60, async () => {
        const { data: topoData, degraded, source } = await transformTopologyData();
        return {
          ...topoData,
          degraded,
          source,
        };
      }, (msg) => app.log.error(msg));

      if (data.degraded && data.degraded.length > 0) {
        reply.status(206);
      }

      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch topology data: ${message}`);
      reply.status(500).send({ error: 'Failed to fetch topology data' });
    }
  });

  // GET /api/alerts (5s cadence, 3s cache) - active alerts from SigNoz Alertmanager
  app.get('/api/alerts', async (request, reply) => {
    try {
      const data = await getCachedData('alerts', 3, async () => {
        try {
          // Try to fetch from SigNoz Alertmanager
          const alerts = await signozClient.getActiveAlerts();
          return {
            alerts,
            source: 'alertmanager',
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          app.log.warn(`SigNoz Alertmanager unavailable: ${message}`);
          return {
            alerts: [],
            source: 'unavailable',
          };
        }
      }, (msg) => app.log.error(msg));

      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch alerts: ${message}`);
      reply.status(500).send({ error: 'Failed to fetch alerts' });
    }
  });

  // GET /api/network (30s cadence, 20s cache) — UDM subsystem health, clients, IPS events
  app.get('/api/network', async (request, reply) => {
    try {
      const data = await getCachedData('network', 20, async () => {
        const { data: networkData, degraded } = await transformNetworkData(app.log);
        return { ...networkData, degraded };
      }, (msg) => app.log.error(msg));

      if (data.degraded && data.degraded.length > 0) {
        reply.status(206);
      }

      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch network data: ${message}`);
      reply.status(500).send({ error: 'Failed to fetch network data' });
    }
  });

  // GET /api/logs (10s cache) — operational log stream from SigNoz via homelab-data MCP
  app.get('/api/logs', async (request, reply) => {
    try {
      const data = await getCachedData('logs', 10, async () => {
        const raw = await mcpClient.callTool('signoz_query_logs', { limit: 100 }) as
          | { result?: Array<{ timestamp?: number; severity?: string | null; service?: string | null; body?: string; trace_id?: string | null }> }
          | Array<{ timestamp?: number; severity?: string | null; service?: string | null; body?: string; trace_id?: string | null }>;
        const records = Array.isArray(raw) ? raw : (raw?.result ?? []);
        const entries: LogEntryDTO[] = records.map((r, i) => ({
          id: r.trace_id || `log-${i}`,
          // SigNoz timestamps are epoch nanoseconds
          timestamp: r.timestamp ? Math.floor(r.timestamp / 1e6) : Date.now(),
          level: normalizeLogLevel(r.severity),
          op: r.service || 'signoz',
          target: r.service || '',
          message: r.body ?? '',
        }));
        return { entries, source: 'signoz' as const };
      }, (msg) => app.log.error(msg));
      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch logs: ${message}`);
      reply.send({ entries: [], source: 'unavailable' });
    }
  });

  // GET /api/storage (30s cache) — root filesystem capacity per host from Metricbeat
  app.get('/api/storage', async (request, reply) => {
    try {
      const data = await getCachedData('storage', 30, async () => {
        const hosts = SERVER_REGISTRY.filter(s => s.metricsHostname);
        const settled = await Promise.allSettled(
          hosts.map(async (s) => {
            const cap = await metricbeatClient.getFilesystemCapacity(s.metricsHostname!);
            return cap ? { host: s.id, mount: '/', ...cap } : null;
          }),
        );
        const filesystems = settled.flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : []));
        const degraded = settled.some(r => r.status === 'rejected') ? ['metricbeat'] : [];
        return {
          filesystems,
          degraded,
          source: filesystems.length > 0 ? ('real' as const) : ('unavailable' as const),
        };
      }, (msg) => app.log.error(msg));

      if (data.degraded && data.degraded.length > 0) reply.status(206);
      reply.send(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Failed to fetch storage data: ${message}`);
      reply.send({ filesystems: [], source: 'unavailable' });
    }
  });

  // Health check
  app.get('/health', async (request, reply) => {
    reply.send({ status: 'ok' });
  });

  // Root info endpoint — only in dev. In production the static plugin + SPA
  // fallback own '/', so registering an explicit '/' route here would shadow
  // the SPA (Fastify prefers an explicit route over the static wildcard).
  if (process.env.NODE_ENV !== 'production') {
    app.get('/', async (request, reply) => {
      reply.send({ message: 'Homelab Dashboard BFF Server' });
    });
  }
}

const fastify = Fastify({ logger: true });

// Enable CORS for local development
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});

// Register all routes
await registerRoutes(fastify);

// Serve static files from client dist
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const publicDir = path.join(__dirname, '../../client/dist');
  await fastify.register(staticPlugin, {
    root: publicDir,
    prefix: '/',
  });

  // SPA fallback: serve index.html for non-API routes
  fastify.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api') && !request.url.startsWith('/health')) {
      reply.sendFile('index.html');
    } else {
      reply.status(404).send({ error: 'Not found' });
    }
  });
}

function validateCredentials(logger: FastifyInstance['log']) {
  if (!config.ntopngToken) {
    logger.warn('NTOPNG_TOKEN environment variable is not set. ntopng requests may fail.');
  }
  if (!config.homelabDataMcpToken) {
    logger.warn('HOMELAB_DATA_MCP_TOKEN environment variable is not set. homelab-data MCP requests will be rejected.');
  }
}

const start = async () => {
  try {
    validateCredentials(fastify.log);
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`Server running at http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
