import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA } from '@homelab/shared';

// 24h history (48 points = 30-min buckets)
function seedHist(seed: number, base: number, amp: number, drift = 0): number[] {
  const out: number[] = [];
  let v = base;
  let r = seed;
  for (let i = 0; i < 48; i++) {
    r = (r * 9301 + 49297) % 233280;
    const n = r / 233280 - 0.5;
    v = Math.max(0.5, Math.min(99, v + n * amp + drift * 0.02));
    out.push(+v.toFixed(1));
  }
  return out;
}

export function getLabData(): LAB_DATA {
  return {
    cluster: {
      name: 'asgard',
      location: 'rack-01 · basement',
      domain: 'lab.local',
      powerDraw: 412,
      powerAvg: 404,
      uptimeDays: 127,
      uptimeHours: 4,
      egressTodayGB: 48.3,
      egressDelta: -12,
      activeAlerts: 2,
      lastSync: '2 min ago',
    },

    servers: [
      {
        id: 'nyx',
        role: 'compute',
        mark: 'NX',
        hostname: 'nyx.lab.local',
        ip: '10.0.0.11',
        model: 'AMD Threadripper 7960X · 24c/48t',
        uptime: '42d 11h',
        status: 'ok',
        cpu: { v: 38, hist: seedHist(11, 35, 8) },
        mem: { v: 62, hist: seedHist(12, 60, 4), used: '79.4', total: '128', unit: 'GB' },
        disk: { v: 71, hist: seedHist(13, 70, 1), used: '5.2', total: '7.3', unit: 'TB' },
        net: { v: 18, hist: seedHist(14, 18, 12), down: '124', up: '36', unit: 'Mbps' },
        temp: '54°C',
        load: '1.82 / 1.91 / 2.04',
        containers: 24,
      },
      {
        id: 'helios',
        role: 'storage',
        mark: 'HS',
        hostname: 'helios.lab.local',
        ip: '10.0.0.12',
        model: 'TrueNAS Core · 8× 16 TB ZRAID2',
        uptime: '127d 4h',
        status: 'ok',
        cpu: { v: 12, hist: seedHist(21, 10, 4) },
        mem: { v: 41, hist: seedHist(22, 40, 2), used: '26.4', total: '64', unit: 'GB' },
        disk: { v: 58, hist: seedHist(23, 58, 0.3), used: '52.1', total: '90', unit: 'TB' },
        net: { v: 8, hist: seedHist(24, 12, 8), down: '38', up: '202', unit: 'Mbps' },
        temp: '47°C',
        load: '0.42 / 0.51 / 0.58',
        containers: 6,
      },
      {
        id: 'aether',
        role: 'k8s',
        mark: 'AE',
        hostname: 'aether.lab.local',
        ip: '10.0.0.13',
        model: 'k3s worker · Intel i7-12700 · 64 GB',
        uptime: '18d 22h',
        status: 'warn',
        cpu: { v: 64, hist: seedHist(31, 50, 14, 1.2) },
        mem: { v: 81, hist: seedHist(32, 75, 6, 0.6), used: '51.8', total: '64', unit: 'GB' },
        disk: { v: 44, hist: seedHist(33, 44, 1), used: '440', total: '1024', unit: 'GB' },
        net: { v: 31, hist: seedHist(34, 30, 14), down: '88', up: '54', unit: 'Mbps' },
        temp: '68°C',
        load: '4.21 / 3.78 / 3.41',
        containers: 47,
      },
      {
        id: 'vega',
        role: 'gpu',
        mark: 'VG',
        hostname: 'vega.lab.local',
        ip: '10.0.0.14',
        model: '2× RTX 4090 · Xeon W5-2455X · 256 GB',
        uptime: '6d 18h',
        status: 'ok',
        cpu: { v: 22, hist: seedHist(41, 18, 6) },
        mem: { v: 47, hist: seedHist(42, 44, 5), used: '120.3', total: '256', unit: 'GB' },
        disk: { v: 31, hist: seedHist(43, 31, 0.5), used: '1.2', total: '4', unit: 'TB' },
        net: { v: 12, hist: seedHist(44, 12, 8), down: '46', up: '24', unit: 'Mbps' },
        temp: '74°C',
        load: '2.14 / 2.02 / 1.88',
        containers: 8,
        gpu: { v: 73, hist: seedHist(45, 60, 18, 1.5), vram: '38.4 / 48 GB', power: '418 W' },
      },
    ],

    gateway: {
      isp: 'Sonic Fiber',
      plan: '10 Gbit symmetric',
      publicIp: '73.214.118.42',
      hostname: 'gw.lab.local',
      geo: 'San Francisco, CA',
      status: 'online',
      statusFor: '14d 8h',
      asn: 'AS46375',
      wanIf: 'wan0 · 10G SFP+',
      pingMs: 11,
      pingHist: seedHist(61, 11, 1.4),
      jitterMs: 0.6,
      lossPct: 0.0,
      lossHist: [0,0,0,0,0,0,0,0.2,0.1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.4,0,0,0,0,0,0,0,0,0],
      downMbps: 412,
      upMbps: 88,
      downHist: seedHist(62, 240, 220),
      upHist: seedHist(63, 70, 60),
      egressTodayGB: 48.3,
      ingressTodayGB: 312.6,
      egressMonthTB: 1.42,
      blockedPct: 18,
      dnsResolved: 1421,
      dnsBlocked: 314,
      vpnPeers: 4,
      vpnPeersActive: 2,
    },

    apps: [
      { id: 'jellyfin',    host: 'nyx',    cat: 'media',    version: '10.9.8',  state: 'running',  meta: 'streams · 2 active' },
      { id: 'immich',      host: 'aether', cat: 'media',    version: '1.118.2', state: 'running',  meta: 'photos · 412k' },
      { id: 'plex',        host: 'nyx',    cat: 'media',    version: '1.40.4',  state: 'stopped',  meta: 'replaced by jellyfin' },
      { id: 'navidrome',   host: 'nyx',    cat: 'media',    version: '0.53.3',  state: 'running',  meta: 'music · 18k tracks' },
      { id: 'home-assistant', host: 'aether', cat: 'iot', version: '2025.5.2',  state: 'running',  meta: '218 entities' },
      { id: 'frigate',     host: 'aether', cat: 'iot',      version: '0.14.1',  state: 'degraded', meta: 'cam-04 lost · 14m' },
      { id: 'mosquitto',   host: 'aether', cat: 'iot',      version: '2.0.18',  state: 'running',  meta: 'mqtt · 48 topics' },
      { id: 'zigbee2mqtt', host: 'aether', cat: 'iot',      version: '1.39.0',  state: 'running',  meta: '37 devices' },
      { id: 'ollama',      host: 'vega',   cat: 'ai',       version: '0.5.1',   state: 'running',  meta: 'qwen2.5:32b warm' },
      { id: 'open-webui',  host: 'vega',   cat: 'ai',       version: '0.4.7',   state: 'running',  meta: '7 sessions' },
      { id: 'comfyui',     host: 'vega',   cat: 'ai',       version: '0.3.10',  state: 'updating', meta: 'pulling deps' },
      { id: 'whisperx',    host: 'vega',   cat: 'ai',       version: '3.3.4',   state: 'running',  meta: 'idle' },
      { id: 'nextcloud',   host: 'helios', cat: 'storage',  version: '29.0.4',  state: 'running',  meta: '4 users · 2.1 TB' },
      { id: 'paperless-ngx', host: 'helios', cat: 'storage', version: '2.10.1', state: 'running',  meta: '8.4k documents' },
      { id: 'vaultwarden', host: 'helios', cat: 'storage',  version: '1.32.5',  state: 'running',  meta: '4 users' },
      { id: 'restic',      host: 'helios', cat: 'storage',  version: '0.17.1',  state: 'running',  meta: 'snapshot 04:00 daily' },
      { id: 'gitea',       host: 'aether', cat: 'dev',      version: '1.22.3',  state: 'running',  meta: '34 repos' },
      { id: 'drone-ci',    host: 'aether', cat: 'dev',      version: '2.21.0',  state: 'running',  meta: '2 pipelines queued' },
      { id: 'registry',    host: 'aether', cat: 'dev',      version: '2.8.3',   state: 'running',  meta: '142 images' },
      { id: 'forgejo-act', host: 'aether', cat: 'dev',      version: '4.1.0',   state: 'failed',   meta: 'runner offline · 2h' },
      { id: 'grafana',     host: 'nyx',    cat: 'obs',      version: '11.2.1',  state: 'running',  meta: '14 dashboards' },
      { id: 'prometheus',  host: 'nyx',    cat: 'obs',      version: '2.54.0',  state: 'running',  meta: 'retention 30d' },
      { id: 'loki',        host: 'nyx',    cat: 'obs',      version: '3.2.0',   state: 'running',  meta: '184 GB ingested' },
      { id: 'alertmanager',host: 'nyx',    cat: 'obs',      version: '0.27.0',  state: 'running',  meta: '2 active' },
      { id: 'pihole',      host: 'aether', cat: 'net',      version: '5.18.4',  state: 'running',  meta: 'blocking 18%' },
      { id: 'wireguard',   host: 'aether', cat: 'net',      version: '1.0.20',  state: 'running',  meta: '4 peers · 2 up' },
      { id: 'traefik',     host: 'aether', cat: 'net',      version: '3.1.5',   state: 'running',  meta: '47 routes' },
      { id: 'caddy',       host: 'nyx',    cat: 'net',      version: '2.8.4',   state: 'running',  meta: 'tls auto · 12 hosts' },
    ],

    bots: [
      {
        id: 'ops-bot',
        label: 'ops-bot',
        role: 'ops',
        avatar: 'OP',
        status: 'busy',
        desc: 'infra operations · sudoer · contained',
        model: 'claude-sonnet-4 · with shell tools',
      },
      {
        id: 'watch-bot',
        label: 'watch-bot',
        role: 'alerts',
        avatar: 'WB',
        status: 'ok',
        desc: 'monitors prometheus + loki, escalates anomalies',
        model: 'claude-haiku-4 · read-only',
      },
      {
        id: 'sync-bot',
        label: 'sync-bot',
        role: 'backup',
        avatar: 'SB',
        status: 'ok',
        desc: 'restic + zfs snapshots, integrity checks',
        model: 'haiku-4 · cron-driven',
      },
      {
        id: 'lab-bot',
        label: 'lab-bot',
        role: 'concierge',
        avatar: 'LB',
        status: 'idle',
        desc: 'overview + planning + delegates to others',
        model: 'sonnet-4 · orchestrator',
      },
    ],

    threadByBot: {
      'ops-bot': [
        { kind: 'divider', label: 'today · 14:02' },
        {
          kind: 'msg',
          who: 'ops-bot',
          when: '14:02',
          body: [
            { p: 'Pulled the latest <code>comfyui</code> image on <code>vega</code> — 7.2 GB. Triggering a graceful restart now; current jobs will drain first.' },
          ],
          tool: {
            name: 'shell · vega',
            status: 'completed in 1.4s',
            lines: [
              { k: '$', v: 'docker compose pull comfyui' },
              { v: '  comfyui  Pulling   7.21 GB / 7.21 GB' },
              { v: '  comfyui  Pulled    sha256:c1f0…a8e2' },
            ],
          },
        },
      ],
      'watch-bot': [],
      'sync-bot': [],
      'lab-bot': [],
    },
  };
}

export function getDockerData(): DOCKER_DATA {
  return {
    hosts: [
      {
        id: 'nyx',
        engine: 'Docker 27.3.1',
        compose: 'docker compose v2.30.1',
        containers: [
          {
            id: 'a1b2c3d4',
            name: 'jellyfin',
            image: 'jellyfin/jellyfin',
            tag: '10.9.8',
            state: 'running',
            health: 'healthy',
            uptime: '18d 4h',
            ports: ['8096:8096/tcp', '8920:8920/tcp'],
            mounts: [
              { type: 'bind', host: '/mnt/media', container: '/media', mode: 'ro' },
              { type: 'bind', host: '/etc/jellyfin/config', container: '/config' },
              { type: 'volume', name: 'jellyfin_cache', container: '/cache' },
            ],
            networks: ['proxy_net', 'media_net'],
            size: '142 MB',
            cpu: 14,
            mem: 1820,
          },
          {
            id: 'b2c3d4e5',
            name: 'navidrome',
            image: 'deluan/navidrome',
            tag: '0.53.3',
            state: 'running',
            health: 'healthy',
            uptime: '32d 2h',
            ports: ['4533:4533/tcp'],
            mounts: [
              { type: 'bind', host: '/mnt/media/music', container: '/music', mode: 'ro' },
              { type: 'volume', name: 'navidrome_data', container: '/data' },
            ],
            networks: ['proxy_net'],
            size: '78 MB',
            cpu: 2,
            mem: 312,
          },
        ],
        networks: [
          { name: 'proxy_net', driver: 'bridge', subnet: '172.20.0.0/16', gateway: '172.20.0.1', scope: 'local', attached: 6 },
          { name: 'obs_net', driver: 'bridge', subnet: '172.21.0.0/16', gateway: '172.21.0.1', scope: 'local', attached: 4 },
        ],
        volumes: [
          { name: 'jellyfin_cache', driver: 'local', size: '4.2 GB', mount: '/var/lib/docker/volumes/jellyfin_cache/_data', usedBy: ['jellyfin'] },
          { name: 'navidrome_data', driver: 'local', size: '184 MB', mount: '/var/lib/docker/volumes/navidrome_data/_data', usedBy: ['navidrome'] },
        ],
      },
      {
        id: 'helios',
        engine: 'Docker 27.3.1',
        compose: 'docker compose v2.30.1',
        containers: [
          {
            id: 'nx01v01a',
            name: 'nextcloud',
            image: 'nextcloud',
            tag: '29.0.4-fpm',
            state: 'running',
            health: 'healthy',
            uptime: '94d 12h',
            ports: ['9000:9000/tcp'],
            mounts: [
              { type: 'bind', host: '/tank/nextcloud/data', container: '/var/www/html/data' },
              { type: 'volume', name: 'nc_apps', container: '/var/www/html/custom_apps' },
            ],
            networks: ['cloud_net'],
            size: '1.4 GB',
            cpu: 4,
            mem: 612,
          },
        ],
        networks: [
          { name: 'cloud_net', driver: 'bridge', subnet: '172.23.0.0/16', gateway: '172.23.0.1', scope: 'local', attached: 5 },
        ],
        volumes: [
          { name: 'nc_apps', driver: 'local', size: '42 MB', mount: '/var/lib/docker/volumes/nc_apps/_data', usedBy: ['nextcloud'] },
        ],
      },
      {
        id: 'aether',
        engine: 'Docker 27.3.1 · k3s 1.30',
        compose: 'kubectl · k3s embedded',
        containers: [
          {
            id: 'k8s01ha',
            name: 'home-assistant',
            image: 'ghcr.io/home-assistant/home-assistant',
            tag: '2025.5.2',
            state: 'running',
            health: 'healthy',
            uptime: '18d 22h',
            ports: ['8123:8123/tcp'],
            mounts: [
              { type: 'bind', host: '/etc/home-assistant/config', container: '/config' },
            ],
            networks: ['iot_net', 'proxy_net'],
            size: '412 MB',
            cpu: 4,
            mem: 612,
          },
        ],
        networks: [
          { name: 'iot_net', driver: 'bridge', subnet: '172.25.0.0/16', gateway: '172.25.0.1', scope: 'local', attached: 8 },
        ],
        volumes: [],
      },
      {
        id: 'vega',
        engine: 'Docker 27.3.1',
        compose: 'docker compose v2.30.1',
        containers: [
          {
            id: 'vega01',
            name: 'ollama',
            image: 'ollama/ollama',
            tag: 'latest',
            state: 'running',
            health: 'healthy',
            uptime: '14d 6h',
            ports: ['11434:11434/tcp'],
            mounts: [
              { type: 'bind', host: '/mnt/ollama/models', container: '/root/.ollama/models' },
            ],
            networks: ['ai_net'],
            size: '8.4 GB',
            cpu: 45,
            mem: 12288,
            gpu: 73,
          },
        ],
        networks: [
          { name: 'ai_net', driver: 'bridge', subnet: '172.26.0.0/16', gateway: '172.26.0.1', scope: 'local', attached: 3 },
        ],
        volumes: [],
      },
    ],
  };
}

export function getTopologyData(): TOPOLOGY_DATA {
  return {
    hosts: ['nyx', 'helios', 'aether', 'vega'],
    bots: [
      {
        id: 'lab-bot',
        label: 'lab-bot',
        role: 'concierge',
        host: 'nyx',
        model: 'claude-sonnet-4',
        desc: 'overview · planning · orchestrator',
        avatar: 'LB',
        status: 'idle',
        mcps: [
          { id: 'cluster-mcp', label: 'cluster-mcp', ver: '0.3.1', kind: 'native', desc: 'cluster state & observability' },
          { id: 'shell-mcp', label: 'shell-mcp', ver: '0.4.0', kind: 'remote', desc: 'host shell access' },
        ],
        delegates: ['ops-bot', 'watch-bot', 'sync-bot'],
        manages: [
          { name: 'homelab-dashboard', host: 'nyx', port: '3000' },
          { name: 'phone-home', host: 'nyx', port: '8000' },
        ],
      },
      {
        id: 'ops-bot',
        label: 'ops-bot',
        role: 'ops',
        host: 'nyx',
        model: 'claude-sonnet-4',
        desc: 'infrastructure operations · sudoer',
        avatar: 'OP',
        status: 'busy',
        mcps: [
          { id: 'docker-mcp', label: 'docker-mcp', ver: '0.2.1', kind: 'native', desc: 'docker & compose control' },
          { id: 'shell-mcp', label: 'shell-mcp', ver: '0.4.0', kind: 'native', desc: 'host shell access' },
        ],
        delegates: [],
        manages: [
          { name: 'docker-compose', host: 'nyx', port: 'unix' },
        ],
      },
      {
        id: 'watch-bot',
        label: 'watch-bot',
        role: 'alerts',
        host: 'aether',
        model: 'claude-haiku-4',
        desc: 'monitoring · alerting · escalation',
        avatar: 'WB',
        status: 'ok',
        mcps: [
          { id: 'prometheus-mcp', label: 'prometheus-mcp', ver: '0.1.5', kind: 'remote', desc: 'prometheus queries' },
        ],
        delegates: [],
        manages: [],
      },
      {
        id: 'sync-bot',
        label: 'sync-bot',
        role: 'backup',
        host: 'helios',
        model: 'claude-haiku-4',
        desc: 'backup · snapshots · integrity',
        avatar: 'SB',
        status: 'ok',
        mcps: [
          { id: 'restic-mcp', label: 'restic-mcp', ver: '0.1.0', kind: 'native', desc: 'restic backup control' },
        ],
        delegates: [],
        manages: [],
      },
    ],
  };
}

export function getStatusData(): STATUS_DATA {
  return {
    cpu: 24,
    ping: 11,
    downMbps: 412,
    upMbps: 88,
    alertCount: 2,
    alertPrimary: 'aether MEM 81%',
  };
}
