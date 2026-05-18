import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';
import { getLabData, getDockerData, getTopologyData, getStatusData } from './mock-data.js';

const fastify = Fastify({ logger: true });

// Enable CORS for local development
await fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});

// Cache with TTL
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

function getCachedData<T>(key: string, ttl: number, generator: () => T): T {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && now - entry.timestamp < entry.ttl * 1000) {
    return entry.data as T;
  }

  const data = generator();
  cache.set(key, { data, timestamp: now, ttl });
  return data;
}

// GET /api/status (2.2s cadence, 2s cache)
fastify.get<{ Reply: STATUS_DATA }>('/api/status', async (request, reply) => {
  const data = getCachedData('status', 2, getStatusData);
  reply.send(data);
});

// GET /api/cluster (15s cadence, 10s cache)
fastify.get<{ Reply: LAB_DATA }>('/api/cluster', async (request, reply) => {
  const data = getCachedData('cluster', 10, getLabData);
  reply.send(data);
});

// GET /api/docker (30s cadence, 20s cache)
fastify.get<{ Reply: DOCKER_DATA }>('/api/docker', async (request, reply) => {
  const data = getCachedData('docker', 20, getDockerData);
  reply.send(data);
});

// GET /api/topology (on-demand, 60s cache)
fastify.get<{ Reply: TOPOLOGY_DATA }>('/api/topology', async (request, reply) => {
  const data = getCachedData('topology', 60, getTopologyData);
  reply.send(data);
});

// POST /api/chat/:botId (SSE stub)
fastify.post<{ Params: { botId: string } }>('/api/chat/:botId', async (request, reply) => {
  const { botId } = request.params;

  // Set up SSE response headers
  reply.header('Content-Type', 'text/event-stream');
  reply.header('Cache-Control', 'no-cache');
  reply.header('Connection', 'keep-alive');

  // Send a simple response event (in production, this would stream from an agent)
  reply.send(`data: {"type": "message", "botId": "${botId}", "content": "Message received"}\n\n`);
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
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || 'localhost';
    await fastify.listen({ port, host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
