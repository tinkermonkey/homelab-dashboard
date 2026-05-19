import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

interface EsResponse {
  aggregations: {
    over_time: {
      buckets: Array<{
        key: number;
        doc_count: number;
        value: { value: number | null };
      }>;
    };
  };
}

interface EsLatestResponse {
  hits: {
    hits: Array<{ _source: Record<string, unknown> }>;
  };
}

export class MetricbeatClient {
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

  private async search(body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}/metricbeat-*/_search`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      timeout: 15000,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Returns 48 half-hour buckets of avg values (0-100 pct) over last 24h
  private async histogramFor(
    hostname: string,
    metricsetName: string,
    field: string,
    extraFilter?: unknown
  ): Promise<number[]> {
    const now = Date.now();
    const start = now - 24 * 60 * 60 * 1000;

    const must: unknown[] = [
      { match: { 'metricset.name': metricsetName } },
      { match: { 'host.name': hostname } },
    ];
    if (extraFilter) must.push(extraFilter);

    const data = (await this.search({
      size: 0,
      query: {
        bool: {
          must,
          filter: [{ range: { '@timestamp': { gte: start, lte: now } } }],
        },
      },
      aggs: {
        over_time: {
          date_histogram: { field: '@timestamp', fixed_interval: '30m' },
          aggs: { value: { avg: { field } } },
        },
      },
    })) as EsResponse;

    return data.aggregations.over_time.buckets
      .slice(-48)
      .map((b) => {
        const v = b.value.value;
        return v !== null ? Math.round(v * 100 * 10) / 10 : 0;
      });
  }

  async getCpuHistory(hostname: string): Promise<number[]> {
    return this.histogramFor(hostname, 'cpu', 'system.cpu.total.norm.pct');
  }

  async getMemoryHistory(hostname: string): Promise<number[]> {
    return this.histogramFor(hostname, 'memory', 'system.memory.actual.used.pct');
  }

  async getDiskHistory(hostname: string): Promise<number[]> {
    return this.histogramFor(
      hostname,
      'filesystem',
      'system.filesystem.used.pct',
      { match: { 'system.filesystem.mount_point': '/' } }
    );
  }

  async getLoadAverage(hostname: string): Promise<string> {
    const data = (await this.search({
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          must: [
            { match: { 'metricset.name': 'load' } },
            { match: { 'host.name': hostname } },
          ],
        },
      },
      _source: ['system.load'],
    })) as EsLatestResponse;

    const src = data.hits.hits[0]?._source as { system?: { load?: { '1': number; '5': number; '15': number } } } | undefined;
    const load = src?.system?.load;
    if (!load) throw new Error(`No load data for ${hostname}`);
    return `${load['1']} / ${load['5']} / ${load['15']}`;
  }
}

export const metricbeatClient = new MetricbeatClient();
