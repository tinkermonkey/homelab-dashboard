import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

const API_V2 = '/lua/rest/v2';

// ifid=2 is enp0s25, the primary LAN/WAN interface on t5610
const WAN_IFID = 2;

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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }
    return headers;
  }

  private async fetch(path: string, params: Record<string, string | number> = {}): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }

    try {
      const response = await fetchWithTimeout(url.toString(), {
        headers: this.getHeaders(),
        timeout: 10000,
      });

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
      throw new Error(`ntopng request failed: ${message}`, { cause: error });
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
    downMbps: number;
    upMbps: number;
    downHist: number[];
    upHist: number[];
    egressTodayGB: number;
  }> {
    const iface = await this.fetch(`${API_V2}/get/interface/data.lua`, { ifid: WAN_IFID }) as Record<string, unknown>;

    const chart = iface.download_upload_chart as { download?: number[]; upload?: number[] } | undefined;
    const downHist = chart?.download ?? [];
    const upHist = chart?.upload ?? [];

    // chart values are in Kbps; convert last value to Mbps for current throughput
    const downMbps = downHist.length > 0 ? this.toNumber(downHist[downHist.length - 1]) / 1000 : 0;
    const upMbps = upHist.length > 0 ? this.toNumber(upHist[upHist.length - 1]) / 1000 : 0;

    // bytes_download is the total bytes received since epoch start (convert to GB)
    const rawEgressBytes = this.toNumber(iface.bytes_download, 0);
    const egressTodayGB = rawEgressBytes > 0 ? Math.round((rawEgressBytes / 1e9) * 100) / 100 : 0;

    return {
      downMbps: Math.round(downMbps * 100) / 100,
      upMbps: Math.round(upMbps * 100) / 100,
      downHist: downHist.map((v) => this.toNumber(v)),
      upHist: upHist.map((v) => this.toNumber(v)),
      egressTodayGB,
    };
  }
}

export const ntopngClient = new NtopngClient();
