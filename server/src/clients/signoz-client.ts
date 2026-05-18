import { config } from '../config.js';

interface PromQLResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values?: Array<[number, string]>;
      value?: [number, string];
    }>;
  };
}

export class SigNozClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(baseUrl: string = config.signozUrl, apiToken: string = config.signozApiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }
    return headers;
  }

  async queryRange(
    query: string,
    start: number,
    end: number,
    step: string = '30m'
  ): Promise<PromQLResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/query_range`);
    url.searchParams.set('query', query);
    url.searchParams.set('start', String(start));
    url.searchParams.set('end', String(end));
    url.searchParams.set('step', step);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as PromQLResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`SigNoz query failed: ${message}`);
    }
  }

  async query(query: string): Promise<PromQLResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/query`);
    url.searchParams.set('query', query);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as PromQLResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`SigNoz query failed: ${message}`);
    }
  }

  // Fetch CPU metrics for a host (48 points, 30-min window)
  async getCpuMetrics(hostname: string): Promise<Array<[number, string]>> {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 48 * 30 * 60; // 48 30-minute buckets

    const response = await this.queryRange(
      `rate(cpu_usage_seconds_total{hostname="${hostname}"}[5m])`,
      start,
      now,
      '30m'
    );

    return response.data.result[0]?.values || [];
  }

  // Fetch memory metrics for a host
  async getMemoryMetrics(hostname: string): Promise<Array<[number, string]>> {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 48 * 30 * 60;

    const response = await this.queryRange(
      `memory_usage_bytes{hostname="${hostname}"} / memory_limit_bytes{hostname="${hostname}"} * 100`,
      start,
      now,
      '30m'
    );

    return response.data.result[0]?.values || [];
  }

  // Fetch disk metrics for a host
  async getDiskMetrics(hostname: string): Promise<Array<[number, string]>> {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 48 * 30 * 60;

    const response = await this.queryRange(
      `disk_used_bytes{hostname="${hostname}"} / disk_total_bytes{hostname="${hostname}"} * 100`,
      start,
      now,
      '30m'
    );

    return response.data.result[0]?.values || [];
  }

  // Fetch temperature for a host
  async getTemperature(hostname: string): Promise<string> {
    const response = await this.query(
      `node_hwmon_temp_celsius{hostname="${hostname}"}`
    );

    const value = response.data.result[0]?.value?.[1];
    if (value) {
      return `${Math.round(parseFloat(value))}°C`;
    }
    return '0°C';
  }

  // Fetch load average for a host
  async getLoadAverage(hostname: string): Promise<string> {
    const [resp1, resp5, resp15] = await Promise.all([
      this.query(`node_load1{hostname="${hostname}"}`),
      this.query(`node_load5{hostname="${hostname}"}`),
      this.query(`node_load15{hostname="${hostname}"}`),
    ]);

    const load1 = resp1.data.result[0]?.value?.[1];
    const load5 = resp5.data.result[0]?.value?.[1];
    const load15 = resp15.data.result[0]?.value?.[1];

    return `${load1} / ${load5} / ${load15}`;
  }

  // Fetch cluster power draw
  async getPowerDraw(): Promise<number> {
    const response = await this.query('sum(power_watts)');
    const value = response.data.result[0]?.value?.[1];
    return value ? parseFloat(value) : 0;
  }

  // Fetch cluster uptime
  async getClusterUptime(): Promise<{ days: number; hours: number }> {
    const response = await this.query('max(node_boot_time_seconds)');
    const value = response.data.result[0]?.value?.[1];
    if (!value) return { days: 0, hours: 0 };

    const bootTime = parseFloat(value);
    const now = Date.now() / 1000;
    const uptime = now - bootTime;
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);

    return { days, hours };
  }

  // Fetch egress today
  async getEgressToday(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - (now % 86400);

    const response = await this.queryRange(
      'increase(network_bytes_sent[1d])',
      startOfDay,
      now,
      '1d'
    );

    const values = response.data.result[0]?.values || [];
    const value = values[values.length - 1]?.[1];
    if (value) {
      return Math.round(parseFloat(value) / (1024 * 1024 * 1024) * 10) / 10;
    }
    return 0;
  }

  // Fetch active alerts from Alertmanager
  async getActiveAlerts(): Promise<Array<{
    name: string;
    severity: string;
    state: string;
    labels: Record<string, string>;
  }>> {
    const url = new URL(`${this.baseUrl}/api/v1/alerts`);
    url.searchParams.set('state', 'active');

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        status: string;
        data?: Array<{
          alert?: string;
          labels?: Record<string, string>;
          annotations?: Record<string, string>;
          state?: string;
          activeAt?: string;
          value?: string;
        }>;
      };

      if (data.status !== 'success' || !data.data) {
        return [];
      }

      return data.data.map((alert) => ({
        name: alert.labels?.alertname || 'Unknown Alert',
        severity: alert.labels?.severity || 'unknown',
        state: alert.state || 'active',
        labels: alert.labels || {},
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch active alerts: ${message}`);
    }
  }
}

export const signozClient = new SigNozClient();
