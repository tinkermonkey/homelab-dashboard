import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';
import { getLabData, getDockerData, getTopologyData, getStatusData } from './mock-data.js';
import { config } from './config.js';
import { getCachedData, peekCache } from './cache.js';
import { transformMetrics } from './transformers/metrics-transformer.js';
import { transformDockerData, transformTopologyData } from './transformers/mcp-transformer.js';
import { transformNetworkData } from './transformers/network-transformer.js';
import { signozClient } from './clients/signoz-client.js';
import { ntopngClient } from './clients/ntopng-client.js';
import { mcpClient } from './clients/mcp-client.js';
import { fetchWithTimeout } from './utils/fetch-with-timeout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate botId: alphanumeric, underscore, and hyphen only, max 64 chars
export function isValidBotId(botId: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(botId);
}

// Max request body size: 1MB
const MAX_BODY_SIZE = 1024 * 1024;

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
        } catch {
          degraded.push('ntopng');
        }

        try {
          const alerts = await signozClient.getActiveAlerts();
          alertCount = alerts.length;
          alertPrimary = alerts[0]?.name ?? '';
        } catch {
          degraded.push('signoz');
        }

        // Ping latency from UDM Pro WAN monitoring (uptime_stats.WAN.latency_average)
        let ping = 0;
        try {
          const raw = await mcpClient.callTool('homelab-data', 'udm_get_network_health') as {
            result?: Array<{ subsystem: string; uptime_stats?: { WAN?: { latency_average?: number } } }>;
          };
          const wan = (raw?.result ?? []).find(s => s.subsystem === 'wan');
          ping = wan?.uptime_stats?.WAN?.latency_average ?? 0;
        } catch {
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
        const { data: topoData, degraded, source } = await transformTopologyData(app.log);
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

  // POST /api/chat/:botId (SSE proxy to phone-home)
  app.post<{ Params: { botId: string } }>('/api/chat/:botId', async (request, reply) => {
    const { botId } = request.params;

    // Validate botId to prevent path traversal
    if (!isValidBotId(botId)) {
      reply.status(400).send({ error: 'Invalid bot ID format' });
      return;
    }

    try {
      // Validate request body size
      const bodyString = JSON.stringify(request.body);
      if (bodyString.length > MAX_BODY_SIZE) {
        reply.status(413).send({ error: 'Request body too large' });
        return;
      }

      const phoneHomeUrl = `${config.phoneHomeChatUrl}/${botId}`;

      const response = await fetchWithTimeout(phoneHomeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.phoneHomeChatToken ? { Authorization: `Bearer ${config.phoneHomeChatToken}` } : {}),
        },
        body: bodyString,
        timeout: 30000,
      });

      if (!response.ok) {
        let errorDetail = 'Chat service unavailable';
        try {
          const responseText = await response.text();
          if (responseText) {
            try {
              const errorJson = JSON.parse(responseText);
              errorDetail = errorJson.error || errorJson.message || responseText.slice(0, 100);
            } catch {
              errorDetail = responseText.slice(0, 100);
            }
          }
        } catch (readError) {
          app.log.debug(`Failed to read upstream error body: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
        }
        reply.status(response.status).send({ error: errorDetail });
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        reply.status(500).send({ error: 'No response body' });
        return;
      }

      // Set up SSE response headers only when streaming is confirmed to start
      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');

      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          reply.raw.write(chunk);
        }

        reply.raw.end();
      } finally {
        await reader.cancel().catch(() => {});
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Chat proxy error for botId ${botId}: ${message}`);

      // If headers already sent (SSE stream started), write error as SSE event
      if (reply.raw.headersSent) {
        reply.raw.write(`data: ${JSON.stringify({ error: 'Chat service error' })}\n\n`);
        reply.raw.end();
      } else {
        reply.status(500).send({ error: 'Chat service error' });
      }
    }
  });

  // Health check
  app.get('/health', async (request, reply) => {
    reply.send({ status: 'ok' });
  });

  // Root endpoint
  app.get('/', async (request, reply) => {
    reply.send({ message: 'Homelab Dashboard BFF Server' });
  });
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
  if (!config.phoneHomeChatToken) {
    logger.warn('PHONE_HOME_CHAT_TOKEN environment variable is not set. Chat requests may not authenticate.');
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
