import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

interface EsResponse {
  aggregations: {
    over_time: {
      buckets: Array<{
        key: number;
        doc_count: number;
        value: { value: number | null };
      }>;
    };
  };
}

interface EsLatestResponse {
  hits: {
    hits: Array<{ _source: Record<string, unknown> }>;
  };
}

export interface DockerContainerInfo {
  host: string;
  id: string;
  name: string;
  image: string;
  status: string;
  created: string;
  cpuPct: number;
  memPct: number;
  sizeRwBytes: number;
  health: string | null;
  ips: string[];
  project: string | null;
}

interface DockerContainerSource {
  host?: { name?: string };
  container?: { name?: string; image?: { name?: string } };
  docker?: {
    container?: {
      status?: string;
      created?: string;
      size?: { rw?: number };
      ip_addresses?: string[];
      labels?: { com_docker_compose_project?: string };
    };
    healthcheck?: { status?: string };
  };
}

interface DockerAggResponse {
  aggregations?: {
    byId: {
      buckets: Array<{
        key: string;
        cpu?: { value: number | null };
        mem?: { value: number | null };
        latest?: { hits: { hits: Array<{ _source: DockerContainerSource }> } };
      }>;
    };
  };
}

export class MetricbeatClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(
    baseUrl: string = config.elastiflowUrl,
    user: string = config.elastiflowUser,
    password: string = config.elastiflowPassword
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = user
      ? `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
      : '';
  }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authHeader) h['Authorization'] = this.authHeader;
    return h;
  }

  private async search(body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}/metricbeat-*/_search`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      timeout: 15000,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Returns 48 half-hour buckets of avg values (0-100 pct) over last 24h
  private async histogramFor(
    hostname: string,
    metricsetName: string,
    field: string,
    extraFilter?: unknown
  ): Promise<number[]> {
    const now = Date.now();
    const start = now - 24 * 60 * 60 * 1000;

    const must: unknown[] = [
      { match: { 'metricset.name': metricsetName } },
      { match: { 'host.name': hostname } },
    ];
    if (extraFilter) must.push(extraFilter);

    const data = (await this.search({
      size: 0,
      query: {
        bool: {
          must,
          filter: [{ range: { '@timestamp': { gte: start, lte: now } } }],
        },
      },
      aggs: {
        over_time: {
          date_histogram: { field: '@timestamp', fixed_interval: '30m' },
          aggs: { value: { avg: { field } } },
        },
      },
    })) as EsResponse;

    return data.aggregations.over_time.buckets
      .slice(-48)
      .map((b) => {
        const v = b.value.value;
        return v !== null ? Math.round(v * 100 * 10) / 10 : 0;
      });
  }

  async getCpuHistory(hostname: string): Promise<number[]> {
    return this.histogramFor(hostname, 'cpu', 'system.cpu.total.norm.pct');
  }

  async getMemoryHistory(hostname: string): Promise<number[]> {
    return this.histogramFor(hostname, 'memory', 'system.memory.actual.used.pct');
  }

  async getDiskHistory(hostname: string): Promise<number[]> {
    return this.histogramFor(
      hostname,
      'filesystem',
      'system.filesystem.used.pct',
      { match: { 'system.filesystem.mount_point': '/' } }
    );
  }

  async getLoadAverage(hostname: string): Promise<string> {
    const data = (await this.search({
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          must: [
            { match: { 'metricset.name': 'load' } },
            { match: { 'host.name': hostname } },
          ],
        },
      },
      _source: ['system.load'],
    })) as EsLatestResponse;

    const src = data.hits.hits[0]?._source as { system?: { load?: { '1': number; '5': number; '15': number } } } | undefined;
    const load = src?.system?.load;
    if (!load) throw new Error(`No load data for ${hostname}`);
    return `${load['1']} / ${load['5']} / ${load['15']}`;
  }

  // Latest root-filesystem capacity for a host (mount '/') from the system module.
  // Returns null when the host has no recent filesystem sample.
  async getFilesystemCapacity(hostname: string): Promise<{
    usedPct: number;
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
  } | null> {
    const data = (await this.search({
      size: 1,
      sort: [{ '@timestamp': 'desc' }],
      query: {
        bool: {
          must: [
            { term: { 'event.module': 'system' } },
            { match: { 'metricset.name': 'filesystem' } },
            { match: { 'host.name': hostname } },
            { match: { 'system.filesystem.mount_point': '/' } },
          ],
        },
      },
      _source: ['system.filesystem'],
    })) as EsLatestResponse;

    const fs = (data.hits.hits[0]?._source as {
      system?: { filesystem?: { used?: { pct?: number; bytes?: number }; total?: number; free?: number } };
    } | undefined)?.system?.filesystem;

    if (!fs || fs.total == null) return null;

    return {
      usedPct: Math.round((fs.used?.pct ?? 0) * 1000) / 10,
      usedBytes: fs.used?.bytes ?? 0,
      totalBytes: fs.total ?? 0,
      freeBytes: fs.free ?? 0,
    };
  }

  // Container inventory from the Metricbeat docker module (reachable over the
  // same ES connection). Joins the `container`, `cpu`/`memory`, and
  // `healthcheck` metricsets by container id over the last 5 minutes.
  async getDockerContainers(): Promise<DockerContainerInfo[]> {
    const recent = { range: { '@timestamp': { gte: 'now-5m' } } };
    const dockerMod = { term: { 'event.module': 'docker' } };

    const [inv, usage, health] = (await Promise.all([
      this.search({
        size: 0,
        query: { bool: { filter: [dockerMod, { term: { 'metricset.name': 'container' } }, recent] } },
        aggs: {
          byId: {
            terms: { field: 'container.id', size: 500 },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: [{ '@timestamp': 'desc' }],
                  _source: [
                    'host.name', 'container.name', 'container.image.name',
                    'docker.container.status', 'docker.container.created',
                    'docker.container.size.rw', 'docker.container.ip_addresses',
                    'docker.container.labels.com_docker_compose_project',
                  ],
                },
              },
            },
          },
        },
      }),
      this.search({
        size: 0,
        query: { bool: { filter: [dockerMod, { terms: { 'metricset.name': ['cpu', 'memory'] } }, recent] } },
        aggs: {
          byId: {
            terms: { field: 'container.id', size: 500 },
            aggs: {
              cpu: { avg: { field: 'docker.cpu.total.pct' } },
              mem: { avg: { field: 'container.memory.usage' } },
            },
          },
        },
      }),
      this.search({
        size: 0,
        query: { bool: { filter: [dockerMod, { term: { 'metricset.name': 'healthcheck' } }, recent] } },
        aggs: {
          byId: {
            terms: { field: 'container.id', size: 500 },
            aggs: { latest: { top_hits: { size: 1, sort: [{ '@timestamp': 'desc' }], _source: ['docker.healthcheck.status'] } } },
          },
        },
      }),
    ])) as [DockerAggResponse, DockerAggResponse, DockerAggResponse];

    const usageById = new Map<string, { cpu: number; mem: number }>();
    for (const b of usage.aggregations?.byId.buckets ?? []) {
      usageById.set(b.key, { cpu: b.cpu?.value ?? 0, mem: b.mem?.value ?? 0 });
    }
    const healthById = new Map<string, string>();
    for (const b of health.aggregations?.byId.buckets ?? []) {
      const status = b.latest?.hits.hits[0]?._source?.docker?.healthcheck?.status;
      if (status) healthById.set(b.key, status);
    }

    const out: DockerContainerInfo[] = [];
    for (const b of inv.aggregations?.byId.buckets ?? []) {
      const src = b.latest?.hits.hits[0]?._source;
      if (!src) continue;
      const u = usageById.get(b.key);
      out.push({
        host: src.host?.name ?? '',
        id: b.key,
        name: src.container?.name ?? '',
        image: src.container?.image?.name ?? '',
        status: src.docker?.container?.status ?? '',
        created: src.docker?.container?.created ?? '',
        cpuPct: u ? Math.round(u.cpu * 100 * 10) / 10 : 0,
        memPct: u ? Math.round(u.mem * 100 * 10) / 10 : 0,
        sizeRwBytes: src.docker?.container?.size?.rw ?? 0,
        health: healthById.get(b.key) ?? null,
        ips: src.docker?.container?.ip_addresses ?? [],
        project: src.docker?.container?.labels?.com_docker_compose_project ?? null,
      });
    }
    return out;
  }

  // Cheap per-host container count (distinct container ids in the last 5m) for
  // the cluster overview, without pulling the full inventory.
  async getContainerCountsByHost(): Promise<Record<string, number>> {
    const data = (await this.search({
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'event.module': 'docker' } },
            { term: { 'metricset.name': 'container' } },
            { range: { '@timestamp': { gte: 'now-5m' } } },
          ],
        },
      },
      aggs: { byHost: { terms: { field: 'host.name', size: 20 }, aggs: { containers: { cardinality: { field: 'container.id' } } } } },
    })) as { aggregations?: { byHost: { buckets: Array<{ key: string; containers: { value: number } }> } } };

    const counts: Record<string, number> = {};
    for (const b of data.aggregations?.byHost.buckets ?? []) {
      counts[b.key] = b.containers.value;
    }
    return counts;
  }
}

export const metricbeatClient = new MetricbeatClient();
