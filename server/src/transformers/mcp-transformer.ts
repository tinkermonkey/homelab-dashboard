import type { DOCKER_DATA, DockerHost, Container, TOPOLOGY_DATA, TopologyBot } from '@homelab/shared';
import type { FastifyBaseLogger } from 'fastify';
import { mcpClient, type McpServer } from '../clients/mcp-client.js';
import { metricbeatClient } from '../clients/metricbeat-client.js';
import { SERVER_REGISTRY } from '../cluster-config.js';

// --- Docker container inventory (from the Metricbeat docker module in ES) ---

// Split "registry/name:tag" into image + tag (a ':' before the last '/' is a
// host:port, not a tag).
function splitImage(full: string): { image: string; tag: string } {
  if (!full) return { image: '', tag: '' };
  const colon = full.lastIndexOf(':');
  if (colon > full.lastIndexOf('/')) {
    return { image: full.slice(0, colon), tag: full.slice(colon + 1) };
  }
  return { image: full, tag: 'latest' };
}

function stateFromStatus(status: string): Container['state'] {
  const s = status.toLowerCase();
  if (s.startsWith('up')) return 'running';
  if (s.startsWith('exited') || s.startsWith('dead')) return 'exited';
  return 'updating';
}

function healthFromContainer(health: string | null, state: Container['state']): Container['health'] {
  if (health === 'healthy') return 'healthy';
  if (health === 'unhealthy') return 'unhealthy';
  if (health === 'starting') return 'pulling';
  if (state === 'exited') return 'stopped';
  return 'healthy';
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${Math.round(v * 10) / 10} ${units[i]}`;
}

// Static metadata for known agents — label, role, desc, avatar, and classification
interface AgentMeta {
  label: string;
  role: string;
  desc: string;
  avatar: string;
  type: 'host' | 'specialist' | 'executor' | 'data';
}

const AGENT_META: Record<string, AgentMeta> = {
  'local-agent': {
    label: 'Local Agent',
    role: 'Phone-home host',
    desc: 'Claude Code agent running on the phone-home server',
    avatar: 'LA',
    type: 'host',
  },
  't5610': {
    label: 'T5610',
    role: 'Compute host',
    desc: 'Claude Code agent on the t5610 compute node',
    avatar: 'T5',
    type: 'host',
  },
  'petit-cochon': {
    label: 'Petit Cochon',
    role: 'Compute host',
    desc: 'Claude Code agent on the petit-cochon compute node',
    avatar: 'PC',
    type: 'host',
  },
  'austins-macbook-pro': {
    label: 'Macbook Pro',
    role: 'Dev workstation',
    desc: 'Claude Code agent on the dev workstation',
    avatar: 'MB',
    type: 'host',
  },
  'signoz-dashboard-builder': {
    label: 'Dashboard Builder',
    role: 'SigNoz specialist',
    desc: 'Designs and builds SigNoz dashboards on demand',
    avatar: 'SB',
    type: 'specialist',
  },
  'researcher': {
    label: 'Researcher',
    role: 'Research analyst',
    desc: 'Answers research questions and synthesises information',
    avatar: 'RE',
    type: 'specialist',
  },
  'network-monitor': {
    label: 'Network Monitor',
    role: 'Network analyst',
    desc: 'Monitors and analyses network flow and topology',
    avatar: 'NM',
    type: 'specialist',
  },
  'signoz-analyst': {
    label: 'SigNoz Analyst',
    role: 'Metrics analyst',
    desc: 'Investigates SigNoz metrics, traces and alerts',
    avatar: 'SA',
    type: 'specialist',
  },
  'ansible-executor': {
    label: 'Ansible Executor',
    role: 'Infrastructure provisioner',
    desc: 'Runs Ansible playbooks against the homelab cluster',
    avatar: 'AE',
    type: 'executor',
  },
  'homelab-data': {
    label: 'Homelab Data',
    role: 'Data service',
    desc: 'Aggregates data from SigNoz, Elasticsearch, ntopng, and UniFi',
    avatar: 'HD',
    type: 'data',
  },
};

function agentStateToStatus(healthy: boolean, state: string): 'ok' | 'busy' | 'idle' {
  if (!healthy) return 'ok';
  if (state === 'running') return 'busy';
  if (state === 'idle') return 'idle';
  return 'ok'; // done or error = last task completed
}

function serverToBot(server: McpServer, state: string): TopologyBot {
  const meta = AGENT_META[server.name];
  const avatar = meta?.avatar ?? server.name.slice(0, 2).toUpperCase();
  const isHostAgent = meta?.type === 'host';

  return {
    id: server.name,
    label: meta?.label ?? server.name,
    role: meta?.role ?? 'Agent',
    host: isHostAgent ? server.name : 'asgard',
    model: 'claude-code',
    desc: meta?.desc ?? `MCP agent at ${server.url}`,
    avatar,
    status: agentStateToStatus(server.healthy, state),
    mcps: [],
    delegates: [],
    manages: [],
  };
}

export async function transformDockerData(logger: FastifyBaseLogger): Promise<{
  data: DOCKER_DATA;
  degraded: string[];
  source: 'real' | 'unavailable';
}> {
  // Container inventory is derived from the Metricbeat docker module in
  // Elasticsearch (same connection used for host metrics): the `container`,
  // `cpu`/`memory`, and `healthcheck` metricsets, joined by container id and
  // grouped per host. Ports/mounts and docker networks/volumes aren't shipped
  // by Metricbeat, so those stay empty.
  try {
    const containers = await metricbeatClient.getDockerContainers();
    const byHost = new Map<string, Container[]>();

    for (const c of containers) {
      const { image, tag } = splitImage(c.image);
      const state = stateFromStatus(c.status);
      const entry: Container = {
        id: c.id.slice(0, 12),
        name: c.name,
        image,
        tag,
        state,
        health: healthFromContainer(c.health, state),
        uptime: c.status,
        ports: [],
        mounts: [],
        networks: c.project ? [c.project] : [],
        size: formatBytes(c.sizeRwBytes),
        cpu: c.cpuPct,
        mem: c.memPct,
      };
      const list = byHost.get(c.host) ?? [];
      list.push(entry);
      byHost.set(c.host, list);
    }

    const hosts: DockerHost[] = [...byHost.entries()]
      .map(([host, conts]): DockerHost => ({
        id: host,
        engine: 'docker',
        compose: '',
        containers: conts.sort((a, b) => a.name.localeCompare(b.name)),
        networks: [],
        volumes: [],
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return { data: { hosts }, degraded: [], source: 'real' };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching container inventory from Metricbeat');
    return { data: { hosts: [] }, degraded: ['docker'], source: 'unavailable' };
  }
}

export async function transformTopologyData(logger: FastifyBaseLogger): Promise<{
  data: TOPOLOGY_DATA;
  degraded: string[];
  source: 'real' | 'unavailable';
}> {
  const degraded: string[] = [];

  try {
    const servers = await mcpClient.getServers();

    // homelab-data is a pure data service — exclude from the interactive bot list
    const agentServers = servers.filter(s => s.name !== 'homelab-data');

    // Fetch task state for every agent in parallel
    const statusResults = await Promise.allSettled(
      agentServers.map(s => mcpClient.getAgentStatus(s.name))
    );

    const bots: TopologyBot[] = agentServers.map((server, idx) => {
      const state = statusResults[idx].status === 'fulfilled'
        ? statusResults[idx].value
        : 'idle';
      return serverToBot(server, state);
    });

    // Physical cluster hosts come from SERVER_REGISTRY (authoritative for hardware)
    const hosts = SERVER_REGISTRY.map(s => s.id);

    return { data: { hosts, bots }, degraded, source: 'real' };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching topology from phone-home');
    degraded.push('phone-home');
    return {
      data: { hosts: SERVER_REGISTRY.map(s => s.id), bots: [] },
      degraded,
      source: 'unavailable',
    };
  }
}
