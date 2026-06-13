import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prometheusRatioToPercent,
  prometheusBytesPerSecToMbps,
  histogramFromPrometheus,
  histogramFromPrometheusMbps,
  transformMetrics,
} from './metrics-transformer.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { metricbeatClient } from '../clients/metricbeat-client.js';
import { mcpClient } from '../clients/mcp-client.js';
import { signozClient } from '../clients/signoz-client.js';
import type { LAB_DATA } from '@homelab/shared';
import type { FastifyBaseLogger } from 'fastify';

describe('Metrics Transformer', () => {
  describe('prometheusRatioToPercent', () => {
    it('converts ratio 0.0 to 0%', () => {
      expect(prometheusRatioToPercent('0.0')).toBe(0);
    });

    it('converts ratio 1.0 to 100%', () => {
      expect(prometheusRatioToPercent('1.0')).toBe(100);
    });

    it('converts ratio 0.5 to 50%', () => {
      expect(prometheusRatioToPercent('0.5')).toBe(50);
    });

    it('converts ratio 0.25 to 25%', () => {
      expect(prometheusRatioToPercent('0.25')).toBe(25);
    });

    it('handles decimal precision', () => {
      expect(prometheusRatioToPercent('0.3333')).toBe(33.33);
    });

    it('handles very small values', () => {
      expect(prometheusRatioToPercent('0.001')).toBe(0.1);
    });

    it('handles values > 1.0 (edge case)', () => {
      expect(prometheusRatioToPercent('1.5')).toBe(150);
    });

    it('rounds to 2 decimal places', () => {
      // 0.666666... should round to 66.67%
      expect(prometheusRatioToPercent('0.6666666666')).toBe(66.67);
    });
  });

  describe('prometheusBytesPerSecToMbps', () => {
    it('converts 125000 bytes/sec to 1 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('125000')).toBe(1);
    });

    it('converts 250000 bytes/sec to 2 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('250000')).toBe(2);
    });

    it('converts 0 bytes/sec to 0 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('0')).toBe(0);
    });

    it('converts 62500 bytes/sec to 0.5 Mbps', () => {
      expect(prometheusBytesPerSecToMbps('62500')).toBe(0.5);
    });

    it('handles fractional inputs', () => {
      expect(prometheusBytesPerSecToMbps('156250.5')).toBeCloseTo(1.25);
    });

    it('rounds to 3 decimal places', () => {
      // 125001 bytes/sec ≈ 1.0000008 Mbps
      expect(prometheusBytesPerSecToMbps('125001')).toBe(1);
    });

    it('handles large values (Gigabit network)', () => {
      // 125,000,000 bytes/sec = 1000 Mbps
      expect(prometheusBytesPerSecToMbps('125000000')).toBe(1000);
    });
  });

  describe('histogramFromPrometheus', () => {
    it('returns empty array for empty input', () => {
      const result = histogramFromPrometheus([]);
      expect(result).toEqual([]);
    });

    it('returns last 48 values from input', () => {
      const values = Array.from({ length: 100 }, (_, i) => [
        i * 1000,
        String((i + 1) / 100),
      ] as [number, string]);

      const result = histogramFromPrometheus(values);
      expect(result).toHaveLength(48);
    });

    it('converts all ratio values to percentages', () => {
      const values = [
        [0, '0.25'],
        [1000, '0.5'],
        [2000, '0.75'],
      ] as [number, string][];

      const result = histogramFromPrometheus(values);
      expect(result).toEqual([25, 50, 75]);
    });

    it('maintains chronological order', () => {
      const values = Array.from({ length: 50 }, (_, i) => [
        i * 1000,
        String(i / 50),
      ] as [number, string]);

      const result = histogramFromPrometheus(values);
      // Should be in ascending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
      }
    });
  });

  describe('histogramFromPrometheusMbps', () => {
    it('returns empty array for empty input', () => {
      const result = histogramFromPrometheusMbps([]);
      expect(result).toEqual([]);
    });

    it('converts byte rates to Mbps', () => {
      const values = [
        [0, '125000'], // 1 Mbps
        [1000, '250000'], // 2 Mbps
        [2000, '375000'], // 3 Mbps
      ] as [number, string][];

      const result = histogramFromPrometheusMbps(values);
      expect(result).toEqual([1, 2, 3]);
    });

    it('returns last 48 values from input', () => {
      const values = Array.from({ length: 100 }, (_, i) => [
        i * 1000,
        String((i + 1) * 125000),
      ] as [number, string]);

      const result = histogramFromPrometheusMbps(values);
      expect(result).toHaveLength(48);
    });
  });

  describe('Error handling', () => {
    it('handles non-numeric string values gracefully (parseFloat returns NaN)', () => {
      const result = prometheusRatioToPercent('invalid');
      expect(isNaN(result)).toBe(true);
    });

    it('handles empty string values', () => {
      const result = prometheusRatioToPercent('');
      expect(isNaN(result)).toBe(true);
    });

    it('handles scientific notation', () => {
      expect(prometheusRatioToPercent('1e-2')).toBe(1);
      expect(prometheusBytesPerSecToMbps('1.25e5')).toBe(1);
    });
  });
});

describe('transformMetrics', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
  } as unknown as FastifyBaseLogger;

  const makeServer = (id: string, ip: string) => ({
    id,
    role: 'compute' as const,
    mark: id.substring(0, 2).toUpperCase(),
    hostname: `${id}.lab.local`,
    ip,
    model: 'Test Model',
    uptime: '0d 0h',
    status: 'ok' as const,
    cpu: { v: 0, hist: [0] },
    mem: { v: 0, hist: [0], used: '0', total: '128', unit: 'GB' as const },
    disk: { v: 0, hist: [0], used: '0', total: '7.3', unit: 'TB' as const },
    net: { v: 0, hist: [0], down: '0', up: '0', unit: 'Mbps' as const },
    temp: '0°C',
    load: '0 / 0 / 0',
    containers: 0,
  });

  const mockLabData: LAB_DATA = {
    cluster: {
      name: 'asgard',
      location: 'rack-01 · basement',
      domain: 'lab.local',
      powerDraw: 0,
      powerAvg: 0,
      uptimeDays: 0,
      uptimeHours: 0,
      egressTodayGB: 0,
      egressDelta: 0,
      activeAlerts: 0,
      lastSync: 'never',
    },
    servers: [
      makeServer('t5610', '192.168.0.117'),
      makeServer('petit-cochon', '192.168.0.245'),
      makeServer('hp7052', '192.168.0.72'),
    ],
    gateway: {
      isp: 'ISP', plan: 'Plan', publicIp: '1.1.1.1', hostname: 'gw.lab.local',
      geo: 'US', status: 'online' as const, statusFor: '127d', asn: '12345', wanIf: 'eth0',
      pingMs: 0, pingHist: [0], jitterMs: 0, lossPct: 0, lossHist: [0],
      downMbps: 0, upMbps: 0, downHist: [0], upHist: [0],
      egressTodayGB: 0, ingressTodayGB: 0, egressMonthTB: 0, blockedPct: 0,
      dnsResolved: 0, dnsBlocked: 0, vpnPeers: 0, vpnPeersActive: 0,
    },
    apps: [],
    bots: [],
    threadByBot: {},
  };

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.clearAllMocks(); });

  const udmHealthResponse = {
    result: [
      {
        subsystem: 'wan',
        status: 'ok',
        wan_ip: '172.20.203.8',
        isp_name: 'FirstLight Fiber',
        asn: 27382,
        gw_name: 'A Bigger Dream',
        uptime_stats: { WAN: { latency_average: 4 } },
      },
      {
        subsystem: 'wlan',
        status: 'error',
        num_user: 32,
        num_disconnected: 2,
      },
      {
        subsystem: 'lan',
        status: 'error',
        num_user: 6,
        num_disconnected: 3,
      },
      {
        subsystem: 'vpn',
        status: 'ok',
        remote_user_num_active: 2,
        remote_user_num_inactive: 1,
      },
      {
        subsystem: 'www',
        status: 'ok',
        latency: 12,
      },
      {
        subsystem: 'gw_system-stats',
        uptime: '148314',
        cpu: '28.8',
        mem: '75.2',
      },
    ],
  };

  const udmClientsResponse = {
    result: [
      { hostname: 't5610', ip: '192.168.0.117', is_wired: true, uptime_s: 148314 },
      { hostname: 'petit-cochon', ip: '192.168.0.245', is_wired: true, uptime_s: 86400 },
      { hostname: 'hp7052', ip: '192.168.0.72', is_wired: true, uptime_s: 172800 },
      { hostname: 'some-phone', ip: '192.168.0.50', is_wired: false, uptime_s: 3600 },
    ],
  };

  function setupAllMocks() {
    vi.spyOn(metricbeatClient, 'getCpuHistory').mockResolvedValue([50]);
    vi.spyOn(metricbeatClient, 'getMemoryHistory').mockResolvedValue([60]);
    vi.spyOn(metricbeatClient, 'getDiskHistory').mockResolvedValue([70]);
    vi.spyOn(metricbeatClient, 'getLoadAverage').mockResolvedValue('1.5 / 1.8 / 2.0');

    vi.spyOn(ntopngClient, 'getWanInterfaceStats').mockResolvedValue({
      downMbps: 500,
      upMbps: 100,
      downHist: [50],
      upHist: [10],
      egressTodayGB: 0,
    });

    vi.spyOn(mcpClient, 'callTool').mockImplementation(async (_server, tool) => {
      if (tool === 'udm_get_network_health') return udmHealthResponse;
      if (tool === 'udm_get_connected_clients') return udmClientsResponse;
      return {};
    });
    vi.spyOn(elastiflowClient, 'getHostThroughput').mockResolvedValue([1.5]);
    vi.spyOn(signozClient, 'getActiveAlerts').mockResolvedValue([]);
  }

  it('returns no degraded services when all succeed', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.degraded).toEqual([]);
  });

  it('updates server cpu/mem/disk/load from metricbeat', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    const nyx = result.data.servers.find((s) => s.id === 't5610');
    expect(nyx?.cpu.hist).toEqual([50]);
    expect(nyx?.mem.hist).toEqual([60]);
    expect(nyx?.disk.hist).toEqual([70]);
    expect(nyx?.load).toBe('1.5 / 1.8 / 2.0');
  });

  it('degrades metricbeat when metrics fetch fails', async () => {
    setupAllMocks();
    const error = new Error('Connection failed');
    vi.mocked(metricbeatClient.getCpuHistory).mockRejectedValue(error);
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.degraded).toContain('metricbeat');
    // Verify logger was called with error object (logs happen in inner catch block)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.any(String)
    );
  });

  it('degrades ntopng when gateway stats fail', async () => {
    setupAllMocks();
    const error = new Error('Network error');
    vi.mocked(ntopngClient.getWanInterfaceStats).mockRejectedValue(error);
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.degraded).toContain('ntopng');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: error }),
      expect.stringContaining('Error fetching ntopng gateway stats')
    );
  });

  it('updates gateway downMbps/upMbps from ntopng', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.gateway.downMbps).toBe(500);
    expect(result.data.gateway.upMbps).toBe(100);
    expect(result.data.gateway.downHist).toEqual([50]);
    expect(result.data.gateway.upHist).toEqual([10]);
  });

  it('degrades elastiflow when throughput fetch fails', async () => {
    setupAllMocks();
    vi.mocked(elastiflowClient.getHostThroughput).mockRejectedValue(new Error('Service unavailable'));
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.degraded).toContain('elastiflow');
  });

  it('populates gateway fields from UDM network health', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.gateway.pingMs).toBe(4);
    expect(result.data.gateway.isp).toBe('FirstLight Fiber');
    expect(result.data.gateway.publicIp).toBe('172.20.203.8');
    expect(result.data.gateway.asn).toBe('27382');
    expect(result.data.gateway.status).toBe('online');
  });

  it('populates gateway statusFor from gw_system-stats uptime', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    // 148314s = 1d 17h
    expect(result.data.gateway.statusFor).toBe('1d 17h');
  });

  it('populates gateway vpnPeers and vpnPeersActive from VPN subsystem', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.gateway.vpnPeers).toBe(3); // active(2) + inactive(1)
    expect(result.data.gateway.vpnPeersActive).toBe(2);
  });

  it('populates server uptime from UDM connected clients', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    const t5610 = result.data.servers.find(s => s.id === 't5610');
    const pc = result.data.servers.find(s => s.id === 'petit-cochon');
    // 148314s = 1d 17h; 86400s = 1d 0h
    expect(t5610?.uptime).toBe('1d 17h');
    expect(pc?.uptime).toBe('1d 0h');
  });

  it('ignores wireless clients when computing server uptime', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    // 'some-phone' is wireless — none of our servers should get 1h uptime from it
    result.data.servers.forEach(s => {
      expect(s.uptime).not.toBe('0d 1h');
    });
  });

  it('populates cluster uptimeDays and uptimeHours from minimum server uptime', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    // minimum is petit-cochon at 86400s = 1d 0h
    expect(result.data.cluster.uptimeDays).toBe(1);
    expect(result.data.cluster.uptimeHours).toBe(0);
  });

  it('degrades udm when UDM health fetch fails', async () => {
    setupAllMocks();
    vi.mocked(mcpClient.callTool).mockRejectedValue(new Error('UDM unreachable'));
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.degraded).toContain('udm');
  });

  it('populates gateway cpuPct and memPct from gw_system-stats', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.gateway.cpuPct).toBe(28.8);
    expect(result.data.gateway.memPct).toBe(75.2);
  });

  it('populates gateway wlanStatus and lanStatus from WLAN/LAN subsystems', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.gateway.wlanStatus).toBe('error');
    expect(result.data.gateway.lanStatus).toBe('error');
  });

  it('populates gateway wwwLatencyMs from WWW subsystem', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.gateway.wwwLatencyMs).toBe(12);
  });

  it('populates gateway clientsTotal from connected clients count', async () => {
    setupAllMocks();
    const result = await transformMetrics(mockLabData, mockLogger);
    // udmClientsResponse has 4 clients (3 wired servers + 1 wireless)
    expect(result.data.gateway.clientsTotal).toBe(4);
  });

  it('preserves original data structure when transformations fail', async () => {
    setupAllMocks();
    vi.mocked(metricbeatClient.getCpuHistory).mockRejectedValue(new Error('Error'));
    const result = await transformMetrics(mockLabData, mockLogger);
    expect(result.data.cluster.name).toBe('asgard');
    expect(result.data.servers).toHaveLength(3);
  });

  it('skips server metric update when histogram is empty', async () => {
    setupAllMocks();
    vi.mocked(metricbeatClient.getCpuHistory).mockResolvedValue([]);
    const result = await transformMetrics(mockLabData, mockLogger);
    const nyx = result.data.servers.find((s) => s.id === 't5610');
    // Empty array should NOT replace existing hist
    expect(nyx?.cpu.hist).not.toEqual([]);
  });

});
