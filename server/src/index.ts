import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';
import { getLabData, getDockerData, getTopologyData, getStatusData, getActiveAlerts } from './mock-data.js';
import { config } from './config.js';
import { getCachedData } from './cache.js';
import { transformMetrics } from './transformers/metrics-transformer.js';
import { transformDockerData, transformTopologyData } from './transformers/mcp-transformer.js';
import { signozClient } from './clients/signoz-client.js';
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
      const data = await getCachedData('status', 2, () => Promise.resolve(getStatusData()), (msg) => app.log.error(msg));
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
        const { data: transformedData, degraded } = await transformMetrics(baseData);

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
        const { data: dockerData, degraded, source } = await transformDockerData();
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
          // Fallback to mock data if SigNoz is unavailable
          const message = error instanceof Error ? error.message : 'Unknown error';
          app.log.warn(`SigNoz Alertmanager unavailable, using mock data: ${message}`);
          return {
            alerts: getActiveAlerts(),
            source: 'mock',
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
        reply.status(response.status).send({ error: 'Chat service unavailable' });
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        reply.raw.write(chunk);
      }

      reply.raw.end();
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
