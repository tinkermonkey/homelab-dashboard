// =====================================================================
// DOCKER_DATA — per-host docker inventory
// =====================================================================

const DOCKER_DATA = {
  hosts: [
    {
      id: 'nyx',
      engine: 'Docker 27.3.1',
      compose: 'docker compose v2.30.1',
      containers: [
        { id: 'a3f2b1', name: 'jellyfin',     image: 'lscr.io/linuxserver/jellyfin', tag: '1.40.4', state: 'running', health: 'healthy',  uptime: '18d 4h',
          ports: ['8096:8096/tcp', '8920:8920/tcp'], mounts: [
            { type: 'bind', host: '/srv/media', container: '/media', mode: 'ro' },
            { type: 'volume', name: 'jellyfin_cache', container: '/cache' },
          ], networks: ['media_net', 'proxy_net'], size: '142 MB', cpu: 14, mem: 1800 },
        { id: 'b8d711', name: 'sonarr',       image: 'lscr.io/linuxserver/sonarr',  tag: '4.0.10', state: 'running', health: 'healthy',  uptime: '12d 1h',
          ports: ['8989:8989/tcp'], mounts: [
            { type: 'bind', host: '/srv/series', container: '/tv' },
            { type: 'bind', host: '/srv/downloads', container: '/downloads' },
          ], networks: ['media_net'], size: '88 MB', cpu: 4, mem: 412 },
        { id: 'c1e904', name: 'radarr',       image: 'lscr.io/linuxserver/radarr',  tag: '5.10.4', state: 'running', health: 'healthy',  uptime: '12d 1h',
          ports: ['7878:7878/tcp'], mounts: [
            { type: 'bind', host: '/srv/movies', container: '/movies' },
          ], networks: ['media_net'], size: '92 MB', cpu: 3, mem: 388 },
        { id: 'd6a233', name: 'plex',         image: 'plexinc/pms-docker',          tag: '1.41.2', state: 'running', health: 'degraded', uptime: '6h 12m',
          ports: ['32400:32400/tcp'], mounts: [
            { type: 'volume', name: 'plex_config', container: '/config' },
            { type: 'bind',   host: '/srv/media', container: '/data', mode: 'ro' },
          ], networks: ['media_net'], size: '512 MB', cpu: 8, mem: 1100 },
        { id: 'e4b187', name: 'gitea',        image: 'gitea/gitea',                 tag: '1.22.3', state: 'running', health: 'healthy',  uptime: '42d 11h',
          ports: ['3000:3000/tcp', '2222:22/tcp'], mounts: [
            { type: 'volume', name: 'gitea_data', container: '/data' },
          ], networks: ['dev_net', 'proxy_net'], size: '410 MB', cpu: 2, mem: 280 },
        { id: 'f17c4d', name: 'drone',        image: 'drone/drone',                 tag: '2.22.0', state: 'running', health: 'healthy',  uptime: '42d 11h',
          ports: ['8081:80/tcp'], mounts: [
            { type: 'volume', name: 'drone_data', container: '/data' },
          ], networks: ['dev_net'], size: '64 MB', cpu: 1, mem: 188 },
        { id: '9a2f81', name: 'code-server',  image: 'lscr.io/linuxserver/code-server', tag: '4.96.4', state: 'running', health: 'healthy', uptime: '42d 11h',
          ports: ['8443:8443/tcp'], mounts: [
            { type: 'bind', host: '/home/you/code', container: '/config/workspace' },
          ], networks: ['dev_net', 'proxy_net'], size: '210 MB', cpu: 6, mem: 920 },
        { id: '17b9e0', name: 'registry',     image: 'registry',                    tag: '2.8.3',  state: 'running', health: 'healthy',  uptime: '42d 11h',
          ports: ['5000:5000/tcp'], mounts: [
            { type: 'volume', name: 'registry_data', container: '/var/lib/registry' },
          ], networks: ['dev_net'], size: '24 MB', cpu: 0.4, mem: 92 },
      ],
      networks: [
        { name: 'proxy_net', dot: 'amber',   driver: 'bridge', subnet: '172.20.0.0/16', gateway: '172.20.0.1', scope: 'local', attached: 5 },
        { name: 'media_net', dot: 'violet',  driver: 'bridge', subnet: '172.21.0.0/16', gateway: '172.21.0.1', scope: 'local', attached: 4 },
        { name: 'dev_net',   dot: 'emerald', driver: 'bridge', subnet: '172.22.0.0/16', gateway: '172.22.0.1', scope: 'local', attached: 4 },
        { name: 'bridge',    dot: 'neutral', driver: 'bridge', subnet: '172.17.0.0/16', gateway: '172.17.0.1', scope: 'local', attached: 0 },
      ],
      volumes: [
        { name: 'jellyfin_cache', driver: 'local', size: '4.2 GB',  mount: '/var/lib/docker/volumes/jellyfin_cache/_data', usedBy: ['jellyfin'] },
        { name: 'plex_config',    driver: 'local', size: '1.8 GB',  mount: '/var/lib/docker/volumes/plex_config/_data',    usedBy: ['plex'] },
        { name: 'gitea_data',     driver: 'local', size: '12.4 GB', mount: '/var/lib/docker/volumes/gitea_data/_data',     usedBy: ['gitea'] },
        { name: 'drone_data',     driver: 'local', size: '720 MB',  mount: '/var/lib/docker/volumes/drone_data/_data',     usedBy: ['drone'] },
        { name: 'registry_data',  driver: 'local', size: '38.1 GB', mount: '/var/lib/docker/volumes/registry_data/_data',  usedBy: ['registry'] },
      ],
    },

    {
      id: 'helios',
      engine: 'Docker 27.3.1',
      compose: 'docker compose v2.30.1',
      containers: [
        { id: '481cab', name: 'minio',        image: 'minio/minio', tag: 'RELEASE.2025-04', state: 'running', health: 'healthy', uptime: '127d',
          ports: ['9000:9000/tcp', '9001:9001/tcp'], mounts: [
            { type: 'bind', host: '/mnt/tank/minio', container: '/data' },
          ], networks: ['storage_net'], size: '188 MB', cpu: 3, mem: 612 },
        { id: '7c9a52', name: 'restic-rest',  image: 'restic/rest-server', tag: '0.13.0', state: 'running', health: 'healthy', uptime: '127d',
          ports: ['8000:8000/tcp'], mounts: [
            { type: 'bind', host: '/mnt/tank/backup', container: '/data' },
          ], networks: ['storage_net'], size: '32 MB', cpu: 0.5, mem: 104 },
        { id: '3e1740', name: 'syncthing',    image: 'syncthing/syncthing', tag: '1.27.10', state: 'running', health: 'healthy', uptime: '127d',
          ports: ['8384:8384/tcp', '22000:22000/tcp'], mounts: [
            { type: 'volume', name: 'syncthing_config', container: '/var/syncthing' },
          ], networks: ['storage_net'], size: '78 MB', cpu: 2, mem: 220 },
        { id: 'ab02c8', name: 'nextcloud',    image: 'nextcloud',  tag: '30.0.2', state: 'running', health: 'unhealthy', uptime: '6d 8h',
          ports: ['8443:443/tcp'], mounts: [
            { type: 'volume', name: 'nextcloud_data', container: '/var/www/html' },
          ], networks: ['storage_net', 'proxy_net'], size: '740 MB', cpu: 12, mem: 1820 },
        { id: 'cc4119', name: 'redis',        image: 'redis', tag: '7.4', state: 'exited', health: 'failed', uptime: '—',
          ports: ['6379:6379/tcp'], mounts: [], networks: ['storage_net'], size: '38 MB', cpu: 0, mem: 0 },
        { id: 'dd9087', name: 'truenas-export', image: 'truenas/proxy', tag: '2.0', state: 'running', health: 'healthy', uptime: '127d',
          ports: ['9100:9100/tcp'], mounts: [], networks: ['storage_net'], size: '14 MB', cpu: 0.2, mem: 48 },
      ],
      networks: [
        { name: 'storage_net', dot: 'emerald', driver: 'bridge', subnet: '172.30.0.0/16', gateway: '172.30.0.1', scope: 'local', attached: 6 },
        { name: 'proxy_net',   dot: 'amber',   driver: 'bridge', subnet: '172.20.0.0/16', gateway: '172.20.0.1', scope: 'local', attached: 1 },
      ],
      volumes: [
        { name: 'syncthing_config', driver: 'local', size: '120 MB',  mount: '/var/lib/docker/volumes/syncthing_config/_data', usedBy: ['syncthing'] },
        { name: 'nextcloud_data',   driver: 'local', size: '88.4 GB', mount: '/var/lib/docker/volumes/nextcloud_data/_data',   usedBy: ['nextcloud'] },
      ],
    },

    {
      id: 'aether',
      engine: 'Docker 27.3.1',
      compose: 'docker compose v2.30.1',
      containers: [
        { id: 'b212c0', name: 'home-assistant', image: 'homeassistant/home-assistant', tag: '2025.5.1', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['8123:8123/tcp'], mounts: [
            { type: 'volume', name: 'hass_config', container: '/config' },
          ], networks: ['iot_net'], size: '480 MB', cpu: 6, mem: 880 },
        { id: 'c842de', name: 'zigbee2mqtt', image: 'koenkk/zigbee2mqtt', tag: '1.41.0', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['8080:8080/tcp'], mounts: [
            { type: 'bind', host: '/srv/z2m', container: '/app/data' },
          ], networks: ['iot_net'], size: '92 MB', cpu: 2, mem: 188 },
        { id: 'd14b07', name: 'mosquitto', image: 'eclipse-mosquitto', tag: '2.0.20', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['1883:1883/tcp', '9001:9001/tcp'], mounts: [
            { type: 'volume', name: 'mqtt_data', container: '/mosquitto' },
          ], networks: ['iot_net'], size: '12 MB', cpu: 0.3, mem: 36 },
        { id: 'e5a911', name: 'node-red', image: 'nodered/node-red', tag: '4.0.5', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['1880:1880/tcp'], mounts: [
            { type: 'volume', name: 'nodered_data', container: '/data' },
          ], networks: ['iot_net'], size: '184 MB', cpu: 1, mem: 220 },
        { id: 'f3e210', name: 'prometheus', image: 'prom/prometheus', tag: '2.55.0', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['9090:9090/tcp'], mounts: [
            { type: 'volume', name: 'prom_data', container: '/prometheus' },
          ], networks: ['obs_net'], size: '290 MB', cpu: 7, mem: 1640 },
        { id: '7d18a4', name: 'grafana', image: 'grafana/grafana', tag: '11.4.0', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['3000:3000/tcp'], mounts: [
            { type: 'volume', name: 'grafana_data', container: '/var/lib/grafana' },
          ], networks: ['obs_net', 'proxy_net'], size: '320 MB', cpu: 3, mem: 480 },
        { id: '8c2bf1', name: 'loki', image: 'grafana/loki', tag: '3.2.1', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['3100:3100/tcp'], mounts: [
            { type: 'volume', name: 'loki_data', container: '/loki' },
          ], networks: ['obs_net'], size: '112 MB', cpu: 4, mem: 1240 },
        { id: '9e4720', name: 'pihole', image: 'pihole/pihole', tag: '5.18', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['53:53/udp', '8082:80/tcp'], mounts: [
            { type: 'volume', name: 'pihole_etc', container: '/etc/pihole' },
          ], networks: ['net_net', 'proxy_net'], size: '380 MB', cpu: 1, mem: 240 },
        { id: 'a01c4b', name: 'wireguard', image: 'lscr.io/linuxserver/wireguard', tag: 'latest', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['51820:51820/udp'], mounts: [
            { type: 'bind', host: '/srv/wg', container: '/config' },
          ], networks: ['net_net'], size: '48 MB', cpu: 0.4, mem: 64 },
        { id: 'b25fd8', name: 'traefik', image: 'traefik', tag: '3.2.1', state: 'running', health: 'healthy', uptime: '18d',
          ports: ['80:80/tcp', '443:443/tcp'], mounts: [
            { type: 'bind', host: '/srv/traefik/traefik.yml', container: '/traefik.yml', mode: 'ro' },
            { type: 'bind', host: '/var/run/docker.sock', container: '/var/run/docker.sock', mode: 'ro' },
          ], networks: ['proxy_net'], size: '110 MB', cpu: 2, mem: 168 },
        { id: 'c3a672', name: 'unbound', image: 'mvance/unbound', tag: '1.21.0', state: 'updating', health: 'pulling', uptime: '—',
          ports: ['5335:53/udp'], mounts: [], networks: ['net_net'], size: '6 MB', cpu: 0, mem: 0 },
        { id: 'd0e190', name: 'signoz', image: 'signoz/frontend', tag: '0.56.0', state: 'running', health: 'healthy', uptime: '14d',
          ports: ['3301:3301/tcp'], mounts: [
            { type: 'volume', name: 'signoz_data', container: '/var/lib/signoz' },
          ], networks: ['obs_net'], size: '480 MB', cpu: 3, mem: 1100 },
      ],
      networks: [
        { name: 'iot_net',    dot: 'amber',   driver: 'bridge', subnet: '172.40.0.0/16', gateway: '172.40.0.1', scope: 'local', attached: 4 },
        { name: 'obs_net',    dot: 'cyan',    driver: 'bridge', subnet: '172.41.0.0/16', gateway: '172.41.0.1', scope: 'local', attached: 4 },
        { name: 'net_net',    dot: 'rose',    driver: 'bridge', subnet: '172.42.0.0/16', gateway: '172.42.0.1', scope: 'local', attached: 3 },
        { name: 'proxy_net',  dot: 'amber',   driver: 'bridge', subnet: '172.20.0.0/16', gateway: '172.20.0.1', scope: 'local', attached: 3 },
      ],
      volumes: [
        { name: 'hass_config', driver: 'local', size: '380 MB', mount: '/var/lib/docker/volumes/hass_config/_data', usedBy: ['home-assistant'] },
        { name: 'prom_data',   driver: 'local', size: '42.8 GB', mount: '/var/lib/docker/volumes/prom_data/_data',   usedBy: ['prometheus'] },
        { name: 'loki_data',   driver: 'local', size: '18.4 GB', mount: '/var/lib/docker/volumes/loki_data/_data',   usedBy: ['loki'] },
        { name: 'signoz_data', driver: 'local', size: '12.1 GB', mount: '/var/lib/docker/volumes/signoz_data/_data', usedBy: ['signoz'] },
      ],
    },

    {
      id: 'vega',
      engine: 'Docker 27.3.1',
      compose: 'docker compose v2.30.1',
      containers: [
        { id: 'ee71b0', name: 'ollama',      image: 'ollama/ollama', tag: '0.4.1',     state: 'running', health: 'healthy', uptime: '9d 02h',
          ports: ['11434:11434/tcp'], mounts: [
            { type: 'volume', name: 'ollama_models', container: '/root/.ollama' },
          ], networks: ['ai_net'], size: '742 MB', cpu: 18, mem: 4200, gpu: 73 },
        { id: 'ff12c4', name: 'open-webui',  image: 'ghcr.io/open-webui/open-webui', tag: '0.4.7', state: 'running', health: 'healthy', uptime: '9d',
          ports: ['3010:8080/tcp'], mounts: [
            { type: 'volume', name: 'webui_data', container: '/app/backend/data' },
          ], networks: ['ai_net', 'proxy_net'], size: '280 MB', cpu: 4, mem: 612 },
        { id: '012a78', name: 'whisper-cpp', image: 'ghcr.io/ggerganov/whisper.cpp', tag: 'large-v3', state: 'updating', health: 'pulling', uptime: '—',
          ports: [], mounts: [
            { type: 'volume', name: 'whisper_models', container: '/models' },
          ], networks: ['ai_net'], size: '6.2 GB', cpu: 0, mem: 0 },
        { id: '03b90c', name: 'comfyui',     image: 'comfyanonymous/comfyui', tag: '0.3.10', state: 'running', health: 'healthy', uptime: '4d 11h',
          ports: ['8188:8188/tcp'], mounts: [
            { type: 'volume', name: 'comfy_models', container: '/comfy/models' },
          ], networks: ['ai_net'], size: '410 MB', cpu: 9, mem: 2880, gpu: 22 },
        { id: '04ac11', name: 'nvidia-exporter', image: 'utkuozdemir/nvidia_gpu_exporter', tag: '1.2.0', state: 'running', health: 'healthy', uptime: '9d',
          ports: ['9835:9835/tcp'], mounts: [], networks: ['obs_net'], size: '12 MB', cpu: 0.4, mem: 48 },
      ],
      networks: [
        { name: 'ai_net',    dot: 'amber',   driver: 'bridge', subnet: '172.50.0.0/16', gateway: '172.50.0.1', scope: 'local', attached: 4 },
        { name: 'obs_net',   dot: 'cyan',    driver: 'bridge', subnet: '172.41.0.0/16', gateway: '172.41.0.1', scope: 'local', attached: 1 },
        { name: 'proxy_net', dot: 'amber',   driver: 'bridge', subnet: '172.20.0.0/16', gateway: '172.20.0.1', scope: 'local', attached: 1 },
      ],
      volumes: [
        { name: 'ollama_models',   driver: 'local', size: '48.2 GB',  mount: '/var/lib/docker/volumes/ollama_models/_data',   usedBy: ['ollama'] },
        { name: 'whisper_models',  driver: 'local', size: '6.4 GB',   mount: '/var/lib/docker/volumes/whisper_models/_data',  usedBy: ['whisper-cpp'] },
        { name: 'comfy_models',    driver: 'local', size: '124.8 GB', mount: '/var/lib/docker/volumes/comfy_models/_data',    usedBy: ['comfyui'] },
        { name: 'webui_data',      driver: 'local', size: '420 MB',   mount: '/var/lib/docker/volumes/webui_data/_data',      usedBy: ['open-webui'] },
      ],
    },
  ],
};

// =====================================================================
// TOPOLOGY_DATA — bot graph
// =====================================================================

const TOPOLOGY_DATA = {
  hosts: ['nyx', 'helios', 'aether', 'vega'],
  bots: [
    {
      id: 'lab-bot', label: 'lab-bot', role: 'concierge', host: 'nyx',
      model: 'claude-sonnet-4', status: 'ok', avatar: 'LB',
      desc: 'Concierge agent. Routes user intents to the right specialist; aggregates context across the cluster.',
      mcps: [
        { id: 'memory',     label: 'memory',     ver: '0.3.1', kind: 'native', desc: 'Long-term lab memory (sqlite-backed)' },
        { id: 'phone-home', label: 'phone-home', ver: '1.4.0', kind: 'remote', desc: 'Remote ops endpoint on agent:3210' },
        { id: 'http-fetch', label: 'http-fetch', ver: '0.1.7', kind: 'native', desc: 'Sandboxed HTTP fetcher' },
        { id: 'search',     label: 'search',     ver: '0.2.0', kind: 'native', desc: 'Local doc + manpage search' },
      ],
      delegates: ['ops-bot', 'watch-bot', 'sync-bot'],
      manages: [
        { name: 'gitea',       host: 'nyx', port: '3000' },
        { name: 'drone',       host: 'nyx', port: '8081' },
        { name: 'code-server', host: 'nyx', port: '8443' },
        { name: 'registry',    host: 'nyx', port: '5000' },
        { name: 'jellyfin',    host: 'nyx', port: '8096' },
        { name: 'sonarr',      host: 'nyx', port: '8989' },
      ],
    },
    {
      id: 'ops-bot', label: 'ops-bot', role: 'ops', host: 'nyx',
      model: 'claude-sonnet-4', status: 'busy', avatar: 'OB',
      desc: 'Operates Docker/k3s/Ansible across all four hosts. Performs mutations; runs through change-approval.',
      mcps: [
        { id: 'docker',  label: 'docker',  ver: '1.2.0', kind: 'native', desc: 'docker socket + compose driver' },
        { id: 'k3s',     label: 'k3s',     ver: '0.4.4', kind: 'native', desc: 'kubectl/helm wrapper on aether' },
        { id: 'ansible', label: 'ansible', ver: '2.16',  kind: 'native', desc: 'Inventory + playbook runner' },
        { id: 'ssh',     label: 'ssh',     ver: '0.3.0', kind: 'native', desc: 'Per-host ssh-mcp (4 targets)' },
      ],
      delegates: [],
      manages: [
        { name: 'home-assistant', host: 'aether', port: '8123' },
        { name: 'zigbee2mqtt',    host: 'aether', port: '8080' },
        { name: 'mosquitto',      host: 'aether', port: '1883' },
        { name: 'traefik',        host: 'aether', port: '443'  },
        { name: 'ollama',         host: 'vega',   port: '11434' },
        { name: 'comfyui',        host: 'vega',   port: '8188' },
      ],
    },
    {
      id: 'sync-bot', label: 'sync-bot', role: 'backup', host: 'helios',
      model: 'claude-haiku-4-5', status: 'idle', avatar: 'SB',
      desc: 'Owns ZFS snapshots, restic, syncthing on helios. Schedules and verifies offsite replication.',
      mcps: [
        { id: 'truenas',   label: 'truenas',   ver: '0.9.1', kind: 'remote', desc: 'TrueNAS REST API client' },
        { id: 'restic',    label: 'restic',    ver: '0.4.0', kind: 'native', desc: 'restic backup + verify' },
        { id: 'syncthing', label: 'syncthing', ver: '0.3.2', kind: 'native', desc: 'sync folder reconciler' },
      ],
      delegates: [],
      manages: [
        { name: 'minio',      host: 'helios', port: '9000' },
        { name: 'restic-rest', host: 'helios', port: '8000' },
        { name: 'syncthing',  host: 'helios', port: '8384' },
        { name: 'nextcloud',  host: 'helios', port: '8443' },
      ],
    },
    {
      id: 'watch-bot', label: 'watch-bot', role: 'alerts', host: 'aether',
      model: 'claude-haiku-4-5', status: 'ok', avatar: 'WB',
      desc: 'Holds the alerting model. Owns Prom/Loki/SigNoz; routes alerts to lab-bot and humans.',
      mcps: [
        { id: 'prometheus', label: 'prometheus', ver: '0.5.0', kind: 'native', desc: 'PromQL + rules editor' },
        { id: 'loki',       label: 'loki',       ver: '0.3.1', kind: 'native', desc: 'LogQL search + tail' },
        { id: 'signoz',     label: 'signoz',     ver: '0.2.1', kind: 'remote', desc: 'Traces + APM bridge' },
        { id: 'alertmanager', label: 'alertmgr', ver: '0.27',  kind: 'native', desc: 'Routes + silences' },
        { id: 'pagerduty',  label: 'pagerduty',  ver: '0.1.0', kind: 'remote', desc: 'Outbound paging' },
      ],
      delegates: [],
      manages: [
        { name: 'prometheus', host: 'aether', port: '9090' },
        { name: 'grafana',    host: 'aether', port: '3000' },
        { name: 'loki',       host: 'aether', port: '3100' },
        { name: 'signoz',     host: 'aether', port: '3301' },
      ],
    },
  ],
};

window.DOCKER_DATA = DOCKER_DATA;
window.TOPOLOGY_DATA = TOPOLOGY_DATA;
