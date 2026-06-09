// =====================================================================
// LAB_DATA — cluster overview seed data
// =====================================================================

// 48-point histories — synthetic but visually realistic
function hist(base, jitter, len = 48) {
  const out = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    v += (Math.random() - 0.5) * jitter;
    v = Math.max(1, Math.min(99, v));
    out.push(+v.toFixed(1));
  }
  return out;
}

const LAB_DATA = {
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
      id: 'nyx', role: 'compute', mark: 'NX',
      hostname: 'nyx.lab.local', ip: '10.0.0.11',
      model: 'Threadripper 7960X · 24c/48t',
      uptime: '42d 11h', status: 'ok',
      cpu:  { v: 38, hist: hist(38, 12), },
      mem:  { v: 62, hist: hist(62, 6), used: '79', total: '128', unit: 'GB' },
      disk: { v: 71, hist: hist(71, 2), used: '5.2', total: '7.3', unit: 'TB' },
      net:  { v: 32, hist: hist(32, 18), down: '124', up: '36', unit: 'Mbps' },
      temp: '54°', load: '3.41', containers: 24,
    },
    {
      id: 'helios', role: 'storage', mark: 'HS',
      hostname: 'helios.lab.local', ip: '10.0.0.12',
      model: 'TrueNAS Core · 8×16 TB ZRAID2',
      uptime: '127d 4h', status: 'ok',
      cpu:  { v: 12, hist: hist(12, 6) },
      mem:  { v: 41, hist: hist(41, 4), used: '26.4', total: '64', unit: 'GB' },
      disk: { v: 58, hist: hist(58, 1), used: '52.1', total: '90', unit: 'TB' },
      net:  { v: 48, hist: hist(48, 22), down: '38', up: '202', unit: 'Mbps' },
      temp: '47°', load: '0.84', containers: 6,
    },
    {
      id: 'aether', role: 'k8s', mark: 'AE',
      hostname: 'aether.lab.local', ip: '10.0.0.13',
      model: 'k3s worker · i7-12700 · 64 GB',
      uptime: '18d 22h', status: 'warn',
      cpu:  { v: 64, hist: hist(64, 18) },
      mem:  { v: 81, hist: hist(81, 6), used: '51.8', total: '64', unit: 'GB' },
      disk: { v: 43, hist: hist(43, 1), used: '440', total: '1024', unit: 'GB' },
      net:  { v: 38, hist: hist(38, 14), down: '88', up: '54', unit: 'Mbps' },
      temp: '68°', load: '6.12', containers: 47,
    },
    {
      id: 'vega', role: 'gpu', mark: 'VG',
      hostname: 'vega.lab.local', ip: '10.0.0.14',
      model: '2× RTX 4090 · Xeon W5-2455X',
      uptime: '9d 02h', status: 'ok',
      cpu:  { v: 22, hist: hist(22, 12) },
      mem:  { v: 47, hist: hist(47, 8), used: '120.3', total: '256', unit: 'GB' },
      disk: { v: 30, hist: hist(30, 2), used: '1.2', total: '4', unit: 'TB' },
      net:  { v: 26, hist: hist(26, 12), down: '46', up: '24', unit: 'Mbps' },
      gpu:  { v: 73, hist: hist(73, 14), vram: '38.4/48 GB', power: '418 W' },
      temp: '74°', load: '2.10', containers: 8,
    },
  ],

  gateway: {
    isp: 'Sonic Fiber', plan: '10 Gbit symmetric',
    publicIp: '73.214.118.42', hostname: 'gw.lab.local',
    geo: 'San Francisco, CA', statusFor: '14d 02h',
    asn: 'AS46375', wanIf: 'wan0 · 10G SFP+',
    status: 'online',
    pingMs: 11, pingHist: hist(11, 4),
    jitterMs: 0.6, lossPct: 0.0, lossHist: hist(0.2, 0.4),
    downMbps: 412, upMbps: 88,
    downHist: hist(380, 80), upHist: hist(90, 40),
    egressTodayGB: 48.3, ingressTodayGB: 312.6, egressMonthTB: 1.42,
    blockedPct: 18, dnsResolved: 1421, dnsBlocked: 314,
    vpnPeers: 4, vpnPeersActive: 2,
  },

  // Applications — 28 across 7 categories. Each tied to a host.
  apps: [
    // media (nyx)
    { id: 'jellyfin',     host: 'nyx',    cat: 'media',  version: '1.40.4', state: 'running', meta: 'streams · 2 active' },
    { id: 'sonarr',       host: 'nyx',    cat: 'media',  version: '4.0.10', state: 'running', meta: 'series · 218' },
    { id: 'radarr',       host: 'nyx',    cat: 'media',  version: '5.10.4', state: 'running', meta: 'movies · 1.4k' },
    { id: 'plex',         host: 'nyx',    cat: 'media',  version: '1.41.2', state: 'degraded', meta: 'transcoder · idle' },
    // iot (aether)
    { id: 'home-assistant', host: 'aether', cat: 'iot',  version: '2025.5.1', state: 'running', meta: '124 entities' },
    { id: 'zigbee2mqtt',    host: 'aether', cat: 'iot',  version: '1.41.0', state: 'running', meta: '38 devices' },
    { id: 'mosquitto',      host: 'aether', cat: 'iot',  version: '2.0.20', state: 'running', meta: 'qos 1 · 12 sub' },
    { id: 'node-red',       host: 'aether', cat: 'iot',  version: '4.0.5',  state: 'running', meta: '14 flows' },
    // ai (vega)
    { id: 'ollama',     host: 'vega',  cat: 'ai',  version: '0.4.1', state: 'running', meta: 'llama3.1-70b' },
    { id: 'open-webui', host: 'vega',  cat: 'ai',  version: '0.4.7', state: 'running', meta: '4 sessions' },
    { id: 'whisper',    host: 'vega',  cat: 'ai',  version: 'large-v3', state: 'updating', meta: 'model pull 64%' },
    { id: 'comfyui',    host: 'vega',  cat: 'ai',  version: '0.3.10', state: 'running', meta: 'queue · 0' },
    // storage (helios)
    { id: 'minio',      host: 'helios', cat: 'storage', version: 'RELEASE.2025-04', state: 'running', meta: '4 buckets · 14.2 TB' },
    { id: 'restic',     host: 'helios', cat: 'storage', version: '0.17.3', state: 'running', meta: 'last 04:00' },
    { id: 'syncthing',  host: 'helios', cat: 'storage', version: '1.27.10', state: 'running', meta: '6 folders' },
    { id: 'nextcloud',  host: 'helios', cat: 'storage', version: '30.0.2', state: 'failed', meta: 'redis down' },
    // dev (nyx)
    { id: 'gitea',       host: 'nyx',  cat: 'dev', version: '1.22.3', state: 'running', meta: '42 repos' },
    { id: 'drone',       host: 'nyx',  cat: 'dev', version: '2.22.0', state: 'running', meta: '2 builds queued' },
    { id: 'code-server', host: 'nyx',  cat: 'dev', version: '4.96.4', state: 'running', meta: '3 workspaces' },
    { id: 'registry',    host: 'nyx',  cat: 'dev', version: '2.8.3',  state: 'running', meta: '184 images' },
    // observability (aether)
    { id: 'prometheus',   host: 'aether', cat: 'obs', version: '2.55.0', state: 'running', meta: 'retention 30d' },
    { id: 'grafana',      host: 'aether', cat: 'obs', version: '11.4.0', state: 'running', meta: '14 dashboards' },
    { id: 'loki',         host: 'aether', cat: 'obs', version: '3.2.1',  state: 'running', meta: 'ingest 412 lps' },
    { id: 'signoz',       host: 'aether', cat: 'obs', version: '0.56.0', state: 'running', meta: 'traces · clickhouse' },
    // network (aether)
    { id: 'pihole',       host: 'aether', cat: 'net', version: '5.18',    state: 'running', meta: 'blocked 18%' },
    { id: 'wireguard',    host: 'aether', cat: 'net', version: '1.0.20210914', state: 'running', meta: '2/4 peers' },
    { id: 'traefik',      host: 'aether', cat: 'net', version: '3.2.1',   state: 'running', meta: '32 routes' },
    { id: 'unbound',      host: 'aether', cat: 'net', version: '1.21.0',  state: 'running', meta: 'cache 78%' },
  ],

  bots: [
    { id: 'lab-bot',   label: 'lab-bot',   role: 'concierge', avatar: 'LB', status: 'ok',
      desc: 'Routes intents to specialist agents; keeps a long-term memory of the homelab.', model: 'claude-sonnet-4' },
    { id: 'ops-bot',   label: 'ops-bot',   role: 'ops',       avatar: 'OB', status: 'busy',
      desc: 'Drives Ansible, Docker, k3s, and ssh-mcp. Performs mutating operations across hosts.', model: 'claude-sonnet-4' },
    { id: 'watch-bot', label: 'watch-bot', role: 'alerts',    avatar: 'WB', status: 'ok',
      desc: 'Owns Prometheus, Loki, SigNoz; raises and routes alerts; tunes thresholds over time.', model: 'claude-haiku-4-5' },
    { id: 'sync-bot',  label: 'sync-bot',  role: 'backup',    avatar: 'SB', status: 'idle',
      desc: 'Manages restic, syncthing, and TrueNAS replication snapshots.', model: 'claude-haiku-4-5' },
  ],

  alerts: [
    { sev: 'WARN', txt: 'aether MEM 81% · sustained 12 min' },
    { sev: 'WARN', txt: 'nextcloud · redis health failing · 6 retries' },
    { sev: 'INFO', txt: 'whisper · model pull 64% on vega' },
  ],
};

window.LAB_DATA = LAB_DATA;
