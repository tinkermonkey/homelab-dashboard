import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';
import { getLabData, getDockerData, getTopologyData, getStatusData, getActiveAlerts } from './mock-data.js';
import { config } from './config.js';
import { transformMetrics } from './transformers/metrics-transformer.js';
import { transformDockerData, transformTopologyData } from './transformers/mcp-transformer.js';
import { signozClient } from './clients/signoz-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

// Enable CORS for local development
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});

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

// Cache with TTL
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

function getCachedData<T>(
  key: string,
  ttl: number,
  generator: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && now - entry.timestamp < entry.ttl * 1000) {
    return Promise.resolve(entry.data as T);
  }

  return generator().then((data) => {
    cache.set(key, { data, timestamp: now, ttl });
    return data;
  }).catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Cache generator error for key "${key}": ${message}`);
    throw error;
  });
}

// GET /api/status (2.2s cadence, 2s cache)
fastify.get('/api/status', async (request, reply) => {
  try {
    const data = await getCachedData('status', 2, () => Promise.resolve(getStatusData()));
    reply.send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Failed to fetch status: ${message}`);
    reply.status(500).send({ error: 'Failed to fetch status' });
  }
});

// GET /api/cluster (15s cadence, 10s cache) - with Promise.allSettled fan-out
fastify.get('/api/cluster', async (request, reply) => {
  try {
    const data = await getCachedData('cluster', 10, async () => {
      const baseData = getLabData();
      const { data: transformedData, degraded } = await transformMetrics(baseData);

      return {
        ...transformedData,
        degraded,
      };
    });

    if (data.degraded && data.degraded.length > 0) {
      reply.status(206);
    }

    reply.send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Failed to fetch cluster data: ${message}`);
    reply.status(500).send({ error: 'Failed to fetch cluster data' });
  }
});

// GET /api/docker (30s cadence, 20s cache)
fastify.get('/api/docker', async (request, reply) => {
  try {
    const data = await getCachedData('docker', 20, async () => {
      const { data: dockerData, degraded } = await transformDockerData();
      return {
        ...dockerData,
        degraded,
      };
    });

    if (data.degraded && data.degraded.length > 0) {
      reply.status(206);
    }

    reply.send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Failed to fetch docker data: ${message}`);
    reply.status(500).send({ error: 'Failed to fetch docker data' });
  }
});

// GET /api/topology (on-demand, 60s cache)
fastify.get('/api/topology', async (request, reply) => {
  try {
    const data = await getCachedData('topology', 60, async () => {
      const { data: topoData, degraded } = await transformTopologyData();
      return {
        ...topoData,
        degraded,
      };
    });

    if (data.degraded && data.degraded.length > 0) {
      reply.status(206);
    }

    reply.send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Failed to fetch topology data: ${message}`);
    reply.status(500).send({ error: 'Failed to fetch topology data' });
  }
});

// GET /api/alerts (5s cadence, 3s cache) - active alerts from SigNoz Alertmanager
fastify.get('/api/alerts', async (request, reply) => {
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
        fastify.log.warn(`SigNoz Alertmanager unavailable, using mock data: ${message}`);
        return {
          alerts: getActiveAlerts(),
          source: 'mock',
        };
      }
    });

    reply.send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Failed to fetch alerts: ${message}`);
    reply.status(500).send({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/chat/:botId (SSE proxy to phone-home)
fastify.post<{ Params: { botId: string } }>('/api/chat/:botId', async (request, reply) => {
  const { botId } = request.params;

  try {
    // Set up SSE response headers
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    const phoneHomeUrl = `${config.phoneHomeChatUrl}/${botId}`;

    const response = await fetch(phoneHomeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      reply.status(response.status);
      reply.send(`data: ${JSON.stringify({ error: 'Chat service unavailable' })}\n\n`);
      return;
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      reply.send(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      reply.raw.write(chunk);
    }

    reply.raw.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    reply.status(500);
    reply.send(`data: ${JSON.stringify({ error: message })}\n\n`);
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'Homelab Dashboard BFF Server' });
});

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`Server running at http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
