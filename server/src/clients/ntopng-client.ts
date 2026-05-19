import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

export interface NtopngInterface {
  name: string;
  stats: {
    bytes_sent: number;
    bytes_rcvd: number;
    packets_sent: number;
    packets_rcvd: number;
    drops: number;
  };
}

export interface NtopngHost {
  ip: string;
  name: string;
  bytes_sent: number;
  bytes_rcvd: number;
  packets_sent: number;
  packets_rcvd: number;
}

const API_V2 = '/lua/rest/v2';

export class NtopngClient {
  private baseUrl: string;
  private token: string;

  constructor(
    baseUrl: string = config.ntopngUrl,
    token: string = config.ntopngToken
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async fetch(path: string, params: Record<string, string | number> = {}): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('token', this.token);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }

    try {
      const response = await fetchWithTimeout(url.toString(), { timeout: 10000 });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      // ntopng REST v2 envelope: {"rc": 0, "rc_str": "OK", "rsp": <payload>}
      if ('rsp' in data) {
        return data.rsp;
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ntopng request failed: ${message}`);
    }
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? fallback : num;
    }
    return fallback;
  }

  async getWanInterfaceStats(): Promise<{
    ping: number;
    jitter: number;
    loss: number;
    downMbps: number;
    upMbps: number;
  }> {
    const iface = await this.fetch(`${API_V2}/get/interface/data.lua`, { ifid: 0 }) as Record<string, unknown>;
    return {
      ping: this.toNumber(iface.ping),
      jitter: this.toNumber(iface.jitter),
      loss: this.toNumber(iface.loss),
      downMbps: this.toNumber(iface.throughput_bps_down) / 1_000_000,
      upMbps: this.toNumber(iface.throughput_bps_up) / 1_000_000,
    };
  }

  async getWanPing(): Promise<number> {
    return (await this.getWanInterfaceStats()).ping;
  }

  async getWanJitter(): Promise<number> {
    return (await this.getWanInterfaceStats()).jitter;
  }

  async getWanLoss(): Promise<number> {
    return (await this.getWanInterfaceStats()).loss;
  }

  async getDNSStats(): Promise<{ resolved: number; blocked: number }> {
    const data = await this.fetch(`${API_V2}/get/dns/stats.lua`) as Record<string, unknown>;
    return {
      resolved: this.toNumber(data.dns_resolved),
      blocked: this.toNumber(data.dns_blocked),
    };
  }

  async getVpnPeers(): Promise<number> {
    const data = await this.fetch(`${API_V2}/get/vpn/peers.lua`);
    if (!Array.isArray(data)) {
      throw new Error('Invalid VPN peers format');
    }
    return data.length;
  }

  async getThroughput(): Promise<{ down: number; up: number }> {
    const stats = await this.getWanInterfaceStats();
    return { down: stats.downMbps, up: stats.upMbps };
  }
}

export const ntopngClient = new NtopngClient();
