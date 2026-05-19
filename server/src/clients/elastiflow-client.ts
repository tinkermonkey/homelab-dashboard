import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

interface EsAggResponse {
  aggregations: {
    over_time: {
      buckets: Array<{
        key: number;
        bytes: { value: number | null };
      }>;
    };
  };
}

// Maps dashboard server ID → LAN IP for flow matching
const SERVER_IP_MAP: Record<string, string> = {
  nyx: '192.168.0.117',
  helios: '192.168.0.245',
  aether: '192.168.0.72',
};

export class ElastiFlowClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(
    baseUrl: string = config.elastiflowUrl,
    user: string = config.elastiflowUser,
    password: string = config.elastiflowPassword
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = user
      ? `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
      : '';
  }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authHeader) h['Authorization'] = this.authHeader;
    return h;
  }

  // Returns 48 half-hour buckets of bytes/sec for a server (by LAN IP)
  // hostname here is the dashboard server ID (nyx/helios/aether)
  async getHostThroughput(hostname: string): Promise<number[]> {
    const ip = SERVER_IP_MAP[hostname];
    if (!ip) return [];

    const now = Date.now();
    const start = now - 24 * 60 * 60 * 1000;

    const url = `${this.baseUrl}/elastiflow-flow-ecs-*/_search`;
    const body = {
      size: 0,
      query: {
        bool: {
          should: [
            { term: { 'source.ip': ip } },
            { term: { 'destination.ip': ip } },
          ],
          minimum_should_match: 1,
          filter: [{ range: { '@timestamp': { gte: start, lte: now } } }],
        },
      },
      aggs: {
        over_time: {
          date_histogram: { field: '@timestamp', fixed_interval: '30m' },
          aggs: { bytes: { sum: { field: 'network.bytes' } } },
        },
      },
    };

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as EsAggResponse;

      return data.aggregations.over_time.buckets
        .slice(-48)
        .map((b) => {
          const bytes = b.bytes.value ?? 0;
          // Convert bytes per 30-min bucket to Mbps average
          return Math.round((bytes / (30 * 60) / 125000) * 1000) / 1000;
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ElastiFlow query failed: ${message}`);
    }
  }
}

export const elastiflowClient = new ElastiFlowClient();
