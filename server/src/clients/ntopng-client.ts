import { config } from '../config.js';

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
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
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
    return data as Record<string, unknown>;
  }

  async getWanPing(): Promise<number> {
    const iface = await this.getInterfaceData();
    return (iface.ping || 0) as number;
  }

  async getWanJitter(): Promise<number> {
    const iface = await this.getInterfaceData();
    return (iface.jitter || 0) as number;
  }

  async getWanLoss(): Promise<number> {
    const iface = await this.getInterfaceData();
    return (iface.loss || 0) as number;
  }

  async getDNSStats(): Promise<{ resolved: number; blocked: number }> {
    const data = await this.fetchWithAuth('/lua/get_dns_stats.lua');
    const stats = data as Record<string, unknown>;
    return {
      resolved: (stats.dns_resolved || 0) as number,
      blocked: (stats.dns_blocked || 0) as number,
    };
  }

  async getVpnPeers(): Promise<number> {
    const data = await this.fetchWithAuth('/lua/get_vpn_peers.lua');
    const peers = data as Array<unknown>;
    return peers.length;
  }

  async getThroughput(): Promise<{ down: number; up: number }> {
    const iface = await this.getInterfaceData();
    return {
      down: (iface.throughput_down || 0) as number,
      up: (iface.throughput_up || 0) as number,
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
      ping: (iface.ping || 0) as number,
      jitter: (iface.jitter || 0) as number,
      loss: (iface.loss || 0) as number,
      downMbps: (iface.throughput_down || 0) as number,
      upMbps: (iface.throughput_up || 0) as number,
    };
  }
}

export const ntopngClient = new NtopngClient();
