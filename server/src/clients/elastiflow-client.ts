import { config } from '../config.js';

interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value?: [number, string];
      values?: Array<[number, string]>;
    }>;
  };
}

export class ElastiFlowClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.elastiflowUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async query(query: string): Promise<PrometheusResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/query`);
    url.searchParams.set('query', query);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as PrometheusResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ElastiFlow query failed: ${message}`);
    }
  }

  async queryRange(
    query: string,
    start: number,
    end: number,
    step: string = '5m'
  ): Promise<PrometheusResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/query_range`);
    url.searchParams.set('query', query);
    url.searchParams.set('start', String(start));
    url.searchParams.set('end', String(end));
    url.searchParams.set('step', step);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as PrometheusResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ElastiFlow query failed: ${message}`);
    }
  }

  // Get network throughput for a host (24h history)
  async getHostThroughput(hostname: string): Promise<Array<[number, string]>> {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 24 * 60 * 60; // 24 hours

    const response = await this.queryRange(
      `rate(flow_bytes_total{hostname="${hostname}"}[5m])`,
      start,
      now,
      '30m'
    );

    return response.data.result[0]?.values || [];
  }

  // Get current throughput for a host
  async getCurrentThroughput(hostname: string): Promise<{ down: number; up: number }> {
    try {
      const response = await this.query(
        `rate(flow_bytes_sent_total{hostname="${hostname}"}[5m]), rate(flow_bytes_rcvd_total{hostname="${hostname}"}[5m])`
      );

      const down = response.data.result[0]?.value?.[1];
      const up = response.data.result[1]?.value?.[1];

      return {
        down: down ? parseFloat(down) / 125000 : 0, // Mbps
        up: up ? parseFloat(up) / 125000 : 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to fetch ElastiFlow throughput for ${hostname}: ${message}`);
      return { down: 0, up: 0 };
    }
  }
}

export const elastiflowClient = new ElastiFlowClient();
