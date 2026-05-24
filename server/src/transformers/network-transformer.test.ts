import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformNetworkData } from './network-transformer.js';
import { mcpClient } from '../clients/mcp-client.js';
import type { FastifyBaseLogger } from 'fastify';

vi.mock('../clients/mcp-client.js');

describe('transformNetworkData', () => {
  const mockLogger: FastifyBaseLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
  } as any;

  const healthResponse = {
    result: [
      {
        subsystem: 'wan',
        status: 'ok',
        wan_ip: '172.20.203.8',
        isp_name: 'FirstLight Fiber',
        asn: 27382,
        gw_name: 'A Bigger Dream',
        uptime_stats: { WAN: { latency_average: 4 } },
        num_sta: 38,
      },
      {
        subsystem: 'wlan',
        status: 'error',
        num_user: 32,
        num_iot: 2,
        num_ap: 4,
        num_disconnected: 2,
      },
      {
        subsystem: 'lan',
        status: 'error',
        num_user: 6,
        num_sw: 5,
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
        cpu: '28.8',
        mem: '75.2',
        uptime: '148314',
      },
    ],
  };

  const clientsResponse = {
    result: [
      { hostname: 't5610', ip: '192.168.0.117', mac: 'aa:bb:cc:dd:ee:01', is_wired: true, bytes_tx: 1000000, bytes_rx: 500000, uptime_s: 148314 },
      { hostname: 'petit-cochon', ip: '192.168.0.245', mac: 'aa:bb:cc:dd:ee:02', is_wired: true, bytes_tx: 500000, bytes_rx: 250000, uptime_s: 86400 },
      { hostname: 'iphone', ip: '192.168.0.55', mac: 'aa:bb:cc:dd:ee:03', is_wired: false, signal_dbm: -62, bytes_tx: 2000000, bytes_rx: 1000000, uptime_s: 3600 },
    ],
  };

  const ipsResponse = {
    result: [
      { _id: 'ips1', datetime: '2026-05-24T00:00:00Z', category: 'ET SCAN', src_ip: '1.2.3.4', dst_ip: '192.168.0.1', msg: 'Port scan detected', priority: 2 },
      { _id: 'ips2', datetime: '2026-05-24T00:01:00Z', category: 'Malicious IP', src_ip: '5.6.7.8', dst_ip: '192.168.0.117', msg: 'Known bad actor', priority: 1 },
    ],
  };

  const eventsResponse = {
    result: [
      { _id: 'evt1', datetime: '2026-05-24T01:00:00Z', key: 'EVT_AP_CONNECTED', msg: 'AP reconnected: hallway-ap' },
      { _id: 'evt2', datetime: '2026-05-24T01:05:00Z', key: 'EVT_LU_Disconnected', msg: 'Client disconnected: ipad' },
    ],
  };

  function setupAllMocks() {
    vi.mocked(mcpClient.callTool).mockImplementation(async (_server, tool) => {
      if (tool === 'udm_get_network_health') return healthResponse;
      if (tool === 'udm_get_connected_clients') return clientsResponse;
      if (tool === 'udm_get_ips_events') return ipsResponse;
      if (tool === 'udm_get_events') return eventsResponse;
      return {};
    });
  }

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.clearAllMocks(); });

  it('returns no degraded sources when all calls succeed', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    expect(result.degraded).toEqual([]);
  });

  it('builds subsystems in canonical order: wan, wlan, lan, vpn, www', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    expect(result.data.subsystems.map(s => s.id)).toEqual(['wan', 'wlan', 'lan', 'vpn', 'www']);
  });

  it('maps WAN subsystem latency and client count', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    const wan = result.data.subsystems.find(s => s.id === 'wan')!;
    expect(wan.status).toBe('ok');
    expect(wan.latencyMs).toBe(4);
    expect(wan.clientCount).toBe(38);
    expect(wan.details).toContain('FirstLight Fiber');
  });

  it('maps WLAN subsystem with error status and disconnected count', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    const wlan = result.data.subsystems.find(s => s.id === 'wlan')!;
    expect(wlan.status).toBe('error');
    expect(wlan.clientCount).toBe(32);
    expect(wlan.details).toContain('2 APs down');
  });

  it('maps LAN subsystem with error status and disconnected switches', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    const lan = result.data.subsystems.find(s => s.id === 'lan')!;
    expect(lan.status).toBe('error');
    expect(lan.details).toContain('3 switches down');
  });

  it('maps VPN active and total peer counts', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    const vpn = result.data.subsystems.find(s => s.id === 'vpn')!;
    expect(vpn.clientCount).toBe(3); // 2 active + 1 inactive
    expect(vpn.details).toContain('2 active');
  });

  it('maps WWW latency', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    const www = result.data.subsystems.find(s => s.id === 'www')!;
    expect(www.latencyMs).toBe(12);
  });

  it('extracts gateway CPU and mem from gw_system-stats', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    expect(result.data.gateway.cpuPct).toBe(28.8);
    expect(result.data.gateway.memPct).toBe(75.2);
  });

  it('counts total, wired, and wireless clients', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    expect(result.data.clients.total).toBe(3);
    expect(result.data.clients.wired).toBe(2);
    expect(result.data.clients.wireless).toBe(1);
  });

  it('sorts top talkers by total bytes descending', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    // iphone has 3MB total vs t5610's 1.5MB
    expect(result.data.clients.topTalkers[0].hostname).toBe('iphone');
    expect(result.data.clients.topTalkers[1].hostname).toBe('t5610');
  });

  it('maps IPS event severity from priority', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    expect(result.data.ipsEvents).toHaveLength(2);
    const critical = result.data.ipsEvents.find(e => e.id === 'ips2');
    const warning = result.data.ipsEvents.find(e => e.id === 'ips1');
    expect(critical?.severity).toBe('critical');  // priority 1
    expect(warning?.severity).toBe('warning');     // priority 2
  });

  it('maps network event type from key pattern', async () => {
    setupAllMocks();
    const result = await transformNetworkData(mockLogger);
    const connected = result.data.events.find(e => e.id === 'evt1');
    const disconnected = result.data.events.find(e => e.id === 'evt2');
    expect(connected?.type).toBe('create');     // CONNECTED → create
    expect(disconnected?.type).toBe('delete');  // Disconnected → delete
  });

  it('degrades udm-health independently when health call fails', async () => {
    setupAllMocks();
    vi.mocked(mcpClient.callTool).mockImplementation(async (_server, tool) => {
      if (tool === 'udm_get_network_health') throw new Error('timeout');
      if (tool === 'udm_get_connected_clients') return clientsResponse;
      if (tool === 'udm_get_ips_events') return ipsResponse;
      if (tool === 'udm_get_events') return eventsResponse;
      return {};
    });
    const result = await transformNetworkData(mockLogger);
    expect(result.degraded).toContain('udm-health');
    expect(result.degraded).not.toContain('udm-clients');
    // Clients still populated
    expect(result.data.clients.total).toBe(3);
    // Subsystems empty
    expect(result.data.subsystems).toEqual([]);
  });

  it('degrades udm-ips gracefully when IPS returns 404 (site-slug bug)', async () => {
    setupAllMocks();
    vi.mocked(mcpClient.callTool).mockImplementation(async (_server, tool) => {
      if (tool === 'udm_get_ips_events') throw new Error('HTTP 404');
      if (tool === 'udm_get_network_health') return healthResponse;
      if (tool === 'udm_get_connected_clients') return clientsResponse;
      if (tool === 'udm_get_events') return eventsResponse;
      return {};
    });
    const result = await transformNetworkData(mockLogger);
    expect(result.degraded).toContain('udm-ips');
    expect(result.data.ipsEvents).toEqual([]);
    // Other data still present
    expect(result.data.subsystems).toHaveLength(5);
  });

  it('returns empty ipsEvents and events arrays when both fail', async () => {
    setupAllMocks();
    vi.mocked(mcpClient.callTool).mockImplementation(async (_server, tool) => {
      if (tool === 'udm_get_ips_events') throw new Error('404');
      if (tool === 'udm_get_events') throw new Error('404');
      if (tool === 'udm_get_network_health') return healthResponse;
      if (tool === 'udm_get_connected_clients') return clientsResponse;
      return {};
    });
    const result = await transformNetworkData(mockLogger);
    expect(result.data.ipsEvents).toEqual([]);
    expect(result.data.events).toEqual([]);
    expect(result.degraded).toContain('udm-ips');
    expect(result.degraded).toContain('udm-events');
  });
});
