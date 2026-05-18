import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prometheusRatioToPercent,
  prometheusBytesPerSecToMbps,
  histogramFromPrometheus,
  histogramFromPrometheusMbps,
  transformMetrics,
} from './metrics-transformer.js';
import { signozClient } from '../clients/signoz-client.js';
import { ntopngClient } from '../clients/ntopng-client.js';
import { elastiflowClient } from '../clients/elastiflow-client.js';
import { mcpClient } from '../clients/mcp-client.js';
import type { LAB_DATA } from '@homelab/shared';

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
      {
        id: 'nyx',
        role: 'compute' as const,
        mark: 'NX',
        hostname: 'nyx.lab.local',
        ip: '10.0.0.11',
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
      },
      {
        id: 'helios',
        role: 'compute' as const,
        mark: 'HE',
        hostname: 'helios.lab.local',
        ip: '10.0.0.12',
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
      },
      {
        id: 'aether',
        role: 'compute' as const,
        mark: 'AE',
        hostname: 'aether.lab.local',
        ip: '10.0.0.13',
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
      },
      {
        id: 'vega',
        role: 'compute' as const,
        mark: 'VG',
        hostname: 'vega.lab.local',
        ip: '10.0.0.14',
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
      },
    ],
    gateway: {
      isp: 'ISP',
      plan: 'Plan',
      publicIp: '1.1.1.1',
      hostname: 'gw.lab.local',
      geo: 'US',
      status: 'online' as const,
      statusFor: '127d',
      asn: '12345',
      wanIf: 'eth0',
      pingMs: 0,
      pingHist: [0],
      jitterMs: 0,
      lossPct: 0,
      lossHist: [0],
      downMbps: 0,
      upMbps: 0,
      downHist: [0],
      upHist: [0],
      egressTodayGB: 0,
      ingressTodayGB: 0,
      egressMonthTB: 0,
      blockedPct: 0,
      dnsResolved: 0,
      dnsBlocked: 0,
      vpnPeers: 0,
      vpnPeersActive: 0,
    },
    apps: [],
    bots: [],
    threadByBot: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function setupAllMocks() {
    vi.spyOn(signozClient, 'getCpuMetrics').mockResolvedValue([[100, '0.5']]);
    vi.spyOn(signozClient, 'getMemoryMetrics').mockResolvedValue([[100, '0.6']]);
    vi.spyOn(signozClient, 'getDiskMetrics').mockResolvedValue([[100, '0.7']]);
    vi.spyOn(signozClient, 'getTemperature').mockResolvedValue('55°C');
    vi.spyOn(signozClient, 'getLoadAverage').mockResolvedValue('1.5 / 1.8 / 2.0');
    vi.spyOn(signozClient, 'getPowerDraw').mockResolvedValue(412);
    vi.spyOn(signozClient, 'getClusterUptime').mockResolvedValue({ days: 127, hours: 4 });

    vi.spyOn(ntopngClient, 'getWanInterfaceStats').mockResolvedValue({
      ping: 25,
      jitter: 5,
      loss: 0,
      downMbps: 500,
      upMbps: 100,
    });
    vi.spyOn(ntopngClient, 'getDNSStats').mockResolvedValue({
      resolved: 1000,
      blocked: 50,
    });
    vi.spyOn(ntopngClient, 'getVpnPeers').mockResolvedValue(0);

    vi.spyOn(elastiflowClient, 'getHostThroughput').mockResolvedValue([[100, '125000']]);
    vi.spyOn(mcpClient, 'listContainers').mockResolvedValue([]);
  }

  it('successfully transforms metrics when all services are available', async () => {
    setupAllMocks();

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toEqual([]);
    expect(result.data.cluster.powerDraw).toBe(412);
    expect(result.data.cluster.uptimeDays).toBe(127);
    expect(result.data.cluster.uptimeHours).toBe(4);
    expect(result.data.gateway.pingMs).toBe(25);
    expect(result.data.gateway.dnsResolved).toBe(1000);
  });

  it('degrades signoz when CPU metrics fail', async () => {
    setupAllMocks();
    vi.mocked(signozClient.getCpuMetrics).mockRejectedValue(new Error('Connection failed'));

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toContain('signoz');
  });

  it('degrades ntopng when gateway stats fail', async () => {
    setupAllMocks();
    vi.mocked(ntopngClient.getWanInterfaceStats).mockRejectedValue(new Error('Network error'));

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toContain('ntopng');
  });

  it('degrades elastiflow when throughput fetch fails', async () => {
    setupAllMocks();
    vi.mocked(elastiflowClient.getHostThroughput).mockRejectedValue(new Error('Service unavailable'));

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toContain('elastiflow');
  });

  it('degrades phone-home when apps fetch fails', async () => {
    setupAllMocks();
    vi.mocked(mcpClient.listContainers).mockRejectedValue(new Error('Connection refused'));

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toContain('phone-home');
  });

  it('handles multiple simultaneous failures', async () => {
    setupAllMocks();
    vi.mocked(signozClient.getCpuMetrics).mockRejectedValue(new Error('Error'));
    vi.mocked(signozClient.getMemoryMetrics).mockRejectedValue(new Error('Error'));
    vi.mocked(signozClient.getDiskMetrics).mockRejectedValue(new Error('Error'));
    vi.mocked(signozClient.getPowerDraw).mockRejectedValue(new Error('Error'));
    vi.mocked(signozClient.getClusterUptime).mockRejectedValue(new Error('Error'));
    vi.mocked(ntopngClient.getWanInterfaceStats).mockRejectedValue(new Error('Error'));
    vi.mocked(elastiflowClient.getHostThroughput).mockRejectedValue(new Error('Error'));
    vi.mocked(mcpClient.listContainers).mockRejectedValue(new Error('Error'));

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toContain('signoz');
    expect(result.degraded).toContain('ntopng');
    expect(result.degraded).toContain('elastiflow');
    expect(result.degraded).toContain('phone-home');
  });

  it('preserves original data structure when transformations fail', async () => {
    setupAllMocks();
    vi.mocked(signozClient.getCpuMetrics).mockRejectedValue(new Error('Error'));

    const result = await transformMetrics(mockLabData);

    expect(result.data.cluster.name).toBe('asgard');
    expect(result.data.servers).toHaveLength(4);
    expect(result.data.servers.every((s) => s.id)).toBe(true);
  });

  it('updates metrics when data is provided', async () => {
    setupAllMocks();
    vi.mocked(signozClient.getMemoryMetrics).mockResolvedValue([[200, '0.6']]);
    vi.mocked(signozClient.getDiskMetrics).mockResolvedValue([[300, '0.7']]);

    const result = await transformMetrics(mockLabData);

    const nyxServer = result.data.servers.find((s) => s.id === 'nyx');
    expect(nyxServer?.cpu.hist).toEqual([50]);
    expect(nyxServer?.mem.hist).toEqual([60]);
    expect(nyxServer?.disk.hist).toEqual([70]);
    expect(nyxServer?.temp).toBe('55°C');
    expect(nyxServer?.load).toBe('1.5 / 1.8 / 2.0');
  });

  it('updates gateway metrics when data is provided', async () => {
    setupAllMocks();
    vi.mocked(ntopngClient.getWanInterfaceStats).mockResolvedValue({
      ping: 25,
      jitter: 5,
      loss: 2,
      downMbps: 500,
      upMbps: 100,
    });

    const result = await transformMetrics(mockLabData);

    expect(result.data.gateway.pingMs).toBe(25);
    expect(result.data.gateway.jitterMs).toBe(5);
    expect(result.data.gateway.lossPct).toBe(2);
    expect(result.data.gateway.downMbps).toBe(500);
    expect(result.data.gateway.upMbps).toBe(100);
    expect(result.data.gateway.dnsResolved).toBe(1000);
    expect(result.data.gateway.dnsBlocked).toBe(50);
  });

  it('skips server metric updates when histogram is empty', async () => {
    setupAllMocks();
    const originalCpu = mockLabData.servers[0].cpu.hist;
    vi.mocked(signozClient.getCpuMetrics).mockResolvedValue([]);
    vi.mocked(signozClient.getMemoryMetrics).mockResolvedValue([]);
    vi.mocked(signozClient.getDiskMetrics).mockResolvedValue([]);

    const result = await transformMetrics(mockLabData);

    const nyxServer = result.data.servers.find((s) => s.id === 'nyx');
    expect(nyxServer?.cpu.hist).toEqual(originalCpu);
  });

  it('updates apps when valid app data is provided', async () => {
    setupAllMocks();
    const mockApps = [
      {
        id: 'app1',
        host: 'nyx',
        cat: 'database',
        version: '5.0',
        state: 'running',
        meta: 'PostgreSQL',
      },
    ];

    vi.mocked(mcpClient.listContainers).mockResolvedValue(mockApps);

    const result = await transformMetrics(mockLabData);

    expect(result.data.apps).toEqual(mockApps);
  });

  it('ignores invalid apps data', async () => {
    setupAllMocks();
    vi.mocked(mcpClient.listContainers).mockResolvedValue({ not: 'array' } as any);

    const result = await transformMetrics(mockLabData);

    expect(result.degraded).toContain('phone-home');
    expect(result.data.apps).toEqual([]);
  });
});
