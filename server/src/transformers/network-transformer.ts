import type { NETWORK_DATA, SubsystemHealth, SubsystemId, NetworkClient, IpsEvent, NetworkEvent } from '@homelab/shared';
import type { FastifyBaseLogger } from 'fastify';
import { mcpClient } from '../clients/mcp-client.js';

// Raw shapes from UDM API
interface RawSubsystem {
  subsystem: string;
  status?: string;
  // WAN
  wan_ip?: string;
  isp_name?: string;
  asn?: number;
  gw_name?: string;
  uptime_stats?: { WAN?: { latency_average?: number } };
  num_sta?: number;
  // WLAN
  num_user?: number;
  num_iot?: number;
  num_ap?: number;
  num_disconnected?: number;
  // LAN
  num_sw?: number;
  // VPN
  remote_user_num_active?: number;
  remote_user_num_inactive?: number;
  // WWW
  latency?: number;
  // gw_system-stats
  cpu?: string;
  mem?: string;
  uptime?: string;
}

interface RawClient {
  hostname?: string;
  ip?: string;
  mac?: string;
  is_wired?: boolean;
  signal_dbm?: number;
  bytes_tx?: number;
  bytes_rx?: number;
  uptime_s?: number;
}

interface RawIpsEvent {
  _id?: string;
  datetime?: string;
  timestamp?: string;
  key?: string;
  category?: string;
  src_ip?: string;
  dst_ip?: string;
  msg?: string;
  priority?: number;
}

interface RawNetworkEvent {
  _id?: string;
  datetime?: string;
  timestamp?: string;
  key?: string;
  msg?: string;
}

function toSubsystemStatus(status?: string): 'ok' | 'warn' | 'error' {
  if (status === 'ok') return 'ok';
  if (status === 'warning') return 'warn';
  return 'error';
}

function ipsPriority(priority?: number): IpsEvent['severity'] {
  if (priority === 1) return 'critical';
  if (priority === 2) return 'warning';
  return 'info';
}

function eventTypeFromKey(key?: string): NetworkEvent['type'] {
  if (!key) return 'update';
  const k = key.toUpperCase();
  // Check DISCONNECTED before CONNECTED — the former contains the latter as substring
  if (k.includes('DISCONNECTED') || k.includes('DELETED') || k.includes('LOST')) return 'delete';
  if (k.includes('CONNECTED') || k.includes('CREATED') || k.includes('ADOPTED')) return 'create';
  if (k.includes('RESTART') || k.includes('PROVISION') || k.includes('UPGRADE')) return 'run';
  return 'update';
}

function buildSubsystems(raw: RawSubsystem[]): SubsystemHealth[] {
  const ORDER: SubsystemId[] = ['wan', 'wlan', 'lan', 'vpn', 'www'];
  const map = new Map<SubsystemId, SubsystemHealth>();

  for (const s of raw) {
    switch (s.subsystem) {
      case 'wan': {
        const latency = s.uptime_stats?.WAN?.latency_average;
        map.set('wan', {
          id: 'wan',
          status: toSubsystemStatus(s.status),
          latencyMs: latency,
          clientCount: s.num_sta ?? 0,
          details: [
            s.isp_name,
            s.num_sta != null ? `${s.num_sta} stations` : null,
            latency != null ? `${latency}ms` : null,
          ].filter(Boolean).join(' · '),
        });
        break;
      }
      case 'wlan': {
        const down = s.num_disconnected ?? 0;
        map.set('wlan', {
          id: 'wlan',
          status: toSubsystemStatus(s.status),
          clientCount: s.num_user ?? 0,
          deviceCount: s.num_ap,
          details: [
            s.num_user != null ? `${s.num_user} users` : null,
            s.num_iot ? `${s.num_iot} IoT` : null,
            down > 0 ? `${down} APs down` : s.num_ap != null ? `${s.num_ap} APs` : null,
          ].filter(Boolean).join(' · '),
        });
        break;
      }
      case 'lan': {
        const down = s.num_disconnected ?? 0;
        map.set('lan', {
          id: 'lan',
          status: toSubsystemStatus(s.status),
          clientCount: s.num_user ?? 0,
          deviceCount: s.num_sw,
          details: [
            s.num_user != null ? `${s.num_user} wired` : null,
            down > 0 ? `${down} switches down` : s.num_sw != null ? `${s.num_sw} switches` : null,
          ].filter(Boolean).join(' · '),
        });
        break;
      }
      case 'vpn': {
        const active = s.remote_user_num_active ?? 0;
        const total = active + (s.remote_user_num_inactive ?? 0);
        map.set('vpn', {
          id: 'vpn',
          status: toSubsystemStatus(s.status),
          clientCount: total,
          details: `${active} active · ${total} peers`,
        });
        break;
      }
      case 'www': {
        map.set('www', {
          id: 'www',
          status: toSubsystemStatus(s.status),
          latencyMs: s.latency,
          clientCount: 0,
          details: s.latency != null ? `${s.latency}ms` : 'ok',
        });
        break;
      }
    }
  }

  return ORDER.map(id => map.get(id)).filter((s): s is SubsystemHealth => s !== undefined);
}

function buildClients(raw: RawClient[]): NETWORK_DATA['clients'] {
  const wired = raw.filter(c => c.is_wired).length;
  const wireless = raw.filter(c => !c.is_wired).length;

  const topTalkers: NetworkClient[] = raw
    .map(c => ({
      hostname: c.hostname || c.ip || 'Unknown',
      ip: c.ip ?? '',
      mac: c.mac ?? '',
      isWired: c.is_wired ?? false,
      signalDbm: c.signal_dbm,
      bytesTx: c.bytes_tx ?? 0,
      bytesRx: c.bytes_rx ?? 0,
      uptimeS: c.uptime_s ?? 0,
    }))
    .sort((a, b) => (b.bytesTx + b.bytesRx) - (a.bytesTx + a.bytesRx))
    .slice(0, 10);

  return { total: raw.length, wired, wireless, topTalkers };
}

export async function transformNetworkData(
  logger: FastifyBaseLogger
): Promise<{ data: NETWORK_DATA; degraded: string[] }> {
  const degraded: string[] = [];

  const [healthResult, clientsResult, ipsResult, eventsResult] = await Promise.allSettled([
    mcpClient.callTool('homelab-data', 'udm_get_network_health'),
    mcpClient.callTool('homelab-data', 'udm_get_connected_clients'),
    mcpClient.callTool('homelab-data', 'udm_get_ips_events'),
    mcpClient.callTool('homelab-data', 'udm_get_events'),
  ]);

  // Health → subsystems + gateway CPU/mem
  let subsystems: SubsystemHealth[] = [];
  let cpuPct = 0;
  let memPct = 0;

  if (healthResult.status === 'fulfilled') {
    const raw = (healthResult.value as { result?: RawSubsystem[] })?.result ?? [];
    subsystems = buildSubsystems(raw);
    const gw = raw.find(s => s.subsystem === 'gw_system-stats');
    if (gw) {
      cpuPct = Math.round(parseFloat(gw.cpu ?? '0') * 10) / 10;
      memPct = Math.round(parseFloat(gw.mem ?? '0') * 10) / 10;
    }
  } else {
    logger.error({ err: healthResult.reason }, 'UDM health unavailable for network view');
    degraded.push('udm-health');
  }

  // Clients
  let clients: NETWORK_DATA['clients'] = { total: 0, wired: 0, wireless: 0, topTalkers: [] };

  if (clientsResult.status === 'fulfilled') {
    const raw = (clientsResult.value as { result?: RawClient[] })?.result ?? [];
    clients = buildClients(raw);
  } else {
    logger.error({ err: clientsResult.reason }, 'UDM clients unavailable for network view');
    degraded.push('udm-clients');
  }

  // IPS events — expected to fail until homelab-data-mcp site-slug bug is resolved
  const ipsEvents: IpsEvent[] = [];

  if (ipsResult.status === 'fulfilled') {
    const raw = (ipsResult.value as { result?: RawIpsEvent[] })?.result ?? [];
    for (const e of raw.slice(0, 50)) {
      ipsEvents.push({
        id: e._id ?? `ips-${Math.random()}`,
        timestamp: e.datetime ?? e.timestamp ?? new Date().toISOString(),
        severity: ipsPriority(e.priority),
        category: e.category ?? e.key ?? 'Unknown',
        srcIp: e.src_ip ?? '',
        dstIp: e.dst_ip ?? '',
        message: e.msg ?? '',
      });
    }
  } else {
    logger.warn({ err: ipsResult.reason }, 'UDM IPS events unavailable (site-slug bug expected)');
    degraded.push('udm-ips');
  }

  // Network events — same bug
  const events: NetworkEvent[] = [];

  if (eventsResult.status === 'fulfilled') {
    const raw = (eventsResult.value as { result?: RawNetworkEvent[] })?.result ?? [];
    for (const e of raw.slice(0, 50)) {
      events.push({
        id: e._id ?? `evt-${Math.random()}`,
        timestamp: e.datetime ?? e.timestamp ?? new Date().toISOString(),
        type: eventTypeFromKey(e.key),
        subject: e.msg ?? e.key ?? 'Network event',
      });
    }
  } else {
    logger.warn({ err: eventsResult.reason }, 'UDM network events unavailable (site-slug bug expected)');
    degraded.push('udm-events');
  }

  return {
    data: { subsystems, clients, gateway: { cpuPct, memPct }, ipsEvents, events },
    degraded,
  };
}
