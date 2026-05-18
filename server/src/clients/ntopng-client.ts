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

export class NtopngClient {
  private baseUrl: string;
  private user: string;
  private password: string;

  constructor(
    baseUrl: string = config.ntopngUrl,
    user: string = config.ntopngUser,
    password: string = config.ntopngPassword
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.user = user;
    this.password = password;
  }

  private async fetchWithAuth(path: string): Promise<unknown> {
    const auth = Buffer.from(`${this.user}:${this.password}`).toString('base64');
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ntopng request failed: ${message}`);
    }
  }

  private async getInterfaceData(): Promise<Record<string, unknown>> {
    const data = await this.fetchWithAuth('/lua/get_interface_data.lua?ifid=0');
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid interface data format');
    }
    return data as Record<string, unknown>;
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? fallback : num;
    }
    return fallback;
  }

  async getWanPing(): Promise<number> {
    const iface = await this.getInterfaceData();
    return this.toNumber(iface.ping);
  }

  async getWanJitter(): Promise<number> {
    const iface = await this.getInterfaceData();
    return this.toNumber(iface.jitter);
  }

  async getWanLoss(): Promise<number> {
    const iface = await this.getInterfaceData();
    return this.toNumber(iface.loss);
  }

  async getDNSStats(): Promise<{ resolved: number; blocked: number }> {
    const data = await this.fetchWithAuth('/lua/get_dns_stats.lua');
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid DNS stats format');
    }
    const stats = data as Record<string, unknown>;
    return {
      resolved: this.toNumber(stats.dns_resolved),
      blocked: this.toNumber(stats.dns_blocked),
    };
  }

  async getVpnPeers(): Promise<number> {
    const data = await this.fetchWithAuth('/lua/get_vpn_peers.lua');
    if (!Array.isArray(data)) {
      throw new Error('Invalid VPN peers format');
    }
    return data.length;
  }

  async getThroughput(): Promise<{ down: number; up: number }> {
    const iface = await this.getInterfaceData();
    return {
      down: this.toNumber(iface.throughput_down),
      up: this.toNumber(iface.throughput_up),
    };
  }

  async getWanInterfaceStats(): Promise<{
    ping: number;
    jitter: number;
    loss: number;
    downMbps: number;
    upMbps: number;
  }> {
    const iface = await this.getInterfaceData();
    return {
      ping: this.toNumber(iface.ping),
      jitter: this.toNumber(iface.jitter),
      loss: this.toNumber(iface.loss),
      downMbps: this.toNumber(iface.throughput_down),
      upMbps: this.toNumber(iface.throughput_up),
    };
  }
}

export const ntopngClient = new NtopngClient();
