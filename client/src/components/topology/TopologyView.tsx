import React, { useCallback, useMemo } from 'react';
import {
  GraphCanvas, GraphInspector, TopologyNode, PageHeader, Chip, Button, AlertStrip,
  type GraphNodeData, type GraphEdgeData,
} from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from '../../utils/localStorage';
import { useTopology, useCluster } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import './TopologyView.css';

const ROLE_COLOR: Record<string, string> = {
  compute: 'cyan',
  storage: 'emerald',
  k8s: 'violet',
  gpu: 'amber',
};

const TP_BOT_LAYOUT: Record<string, { x: number; y: number }> = {
  'lab-bot': { x: 150, y: 200 },
  'ops-bot': { x: 150, y: 500 },
  'sync-bot': { x: 450, y: 200 },
  'watch-bot': { x: 750, y: 200 },
};

const HOST_LAYOUT: Record<string, { x: number; y: number }> = {
  nyx: { x: 600, y: 400 },
  helios: { x: 750, y: 400 },
  aether: { x: 900, y: 400 },
  vega: { x: 1050, y: 400 },
};

export const TopologyView: React.FC = () => {
  const [selectedId, setSelectedId] = usePersistedState<string>('selectedTopologyBot', 'bot:lab-bot');
  const { data: topologyData, isLoading, error } = useTopology();
  const { data: clusterData } = useCluster();

  const serverMap = useMemo(() => {
    const m: Record<string, { role: string }> = {};
    clusterData?.servers.forEach(s => { m[s.id] = { role: s.role }; });
    return m;
  }, [clusterData?.servers]);

  const nodes = useMemo((): GraphNodeData[] => {
    if (!topologyData) return [];
    const result: GraphNodeData[] = [];

    topologyData.hosts.forEach(hid => {
      result.push({
        id: `host:${hid}`,
        label: hid,
        kind: 'host',
        domainColor: ROLE_COLOR[serverMap[hid]?.role ?? 'compute'] ?? 'cyan',
        x: HOST_LAYOUT[hid]?.x,
        y: HOST_LAYOUT[hid]?.y,
      });
    });

    topologyData.bots.forEach(b => {
      result.push({
        id: `bot:${b.id}`,
        label: b.label,
        kind: 'bot',
        domainColor: 'amber',
        x: TP_BOT_LAYOUT[b.id]?.x,
        y: TP_BOT_LAYOUT[b.id]?.y,
      });
    });

    return result;
  }, [topologyData, serverMap]);

  const edges = useMemo((): GraphEdgeData[] => {
    if (!topologyData) return [];
    const result: GraphEdgeData[] = [];

    topologyData.bots.forEach(b => {
      (b.delegates ?? []).forEach(d => {
        result.push({
          id: `del:${b.id}:${d}`,
          sourceId: `bot:${b.id}`,
          targetId: `bot:${d}`,
          label: 'delegates',
        });
      });

      const byHost: Record<string, number> = {};
      (b.manages ?? []).forEach(m => { byHost[m.host] = (byHost[m.host] ?? 0) + 1; });
      Object.keys(byHost).forEach(h => {
        result.push({
          id: `mng:${b.id}:${h}`,
          sourceId: `bot:${b.id}`,
          targetId: `host:${h}`,
          label: String(byHost[h]),
        });
      });
    });

    return result;
  }, [topologyData]);

  const renderNode = useCallback((node: GraphNodeData) => {
    if (!topologyData) return null;

    if (node.kind === 'host') {
      const hid = node.label;
      const s = serverMap[hid];
      return (
        <TopologyNode
          title={hid}
          role={s?.role ?? 'host'}
          status="ok"
          onSelect={() => setSelectedId(node.id)}
        />
      );
    }

    const b = topologyData.bots.find(x => `bot:${x.id}` === node.id);
    if (!b) return null;

    const statusMap: Record<string, 'ok' | 'warning' | 'error' | 'idle'> = {
      ok: 'ok', busy: 'warning', idle: 'idle',
    };

    return (
      <TopologyNode
        title={b.label}
        role={`${b.role} · ${b.model.replace('claude-', '')}`}
        status={statusMap[b.status] ?? 'idle'}
        onSelect={() => setSelectedId(node.id)}
      />
    );
  }, [topologyData, serverMap, setSelectedId]);

  const inspectorNode = useMemo(() => {
    if (!topologyData || !selectedId) return null;

    if (selectedId.startsWith('bot:')) {
      const b = topologyData.bots.find(x => `bot:${x.id}` === selectedId);
      if (!b) return null;
      return {
        id: b.id,
        title: b.label,
        kind: 'agent' as const,
        domain: 'software',
        description: b.desc,
        metadata: {
          model: b.model,
          host: `${b.host}.lab.local`,
          status: b.status,
          mcp_servers: `${b.mcps.length} attached`,
          manages: `${b.manages.length} project${b.manages.length === 1 ? '' : 's'}`,
          ...(b.delegates.length > 0 && { delegates: `${b.delegates.length} bot${b.delegates.length === 1 ? '' : 's'}` }),
        },
      };
    }

    const hid = selectedId.slice(5);
    const s = serverMap[hid];
    return {
      id: `${hid}.lab.local`,
      title: hid,
      kind: 'host' as const,
      domain: ROLE_COLOR[s?.role ?? 'compute'] ?? 'default',
      description: `${s?.role ?? 'host'} node`,
      metadata: { role: s?.role ?? '—' },
    };
  }, [topologyData, selectedId, serverMap]);

  const relationships = useMemo(() => {
    if (!topologyData || !selectedId) return [];

    if (selectedId.startsWith('bot:')) {
      const b = topologyData.bots.find(x => `bot:${x.id}` === selectedId);
      if (!b) return [];
      return [
        ...b.mcps.map(mcp => ({
          id: `mcp-${mcp.id}`,
          target: mcp.id,
          targetTitle: mcp.label,
          targetDomain: 'mcp' as const,
          predicate: `sidecar (${mcp.kind})`,
          direction: 'out' as const,
        })),
        ...b.manages.map(proj => ({
          id: `manage-${proj.name}`,
          target: `host:${proj.host}`,
          targetTitle: `${proj.name} (${proj.host})`,
          targetDomain: proj.host,
          predicate: `manages · ${proj.port}`,
          direction: 'out' as const,
        })),
        ...b.delegates.map(delegateId => ({
          id: `delegate-${delegateId}`,
          target: `bot:${delegateId}`,
          targetTitle: delegateId,
          targetDomain: 'orchestrator',
          predicate: 'delegates to',
          direction: 'out' as const,
        })),
      ];
    }

    const hid = selectedId.slice(5);
    return topologyData.bots
      .filter(b => b.manages.some(m => m.host === hid))
      .map(b => ({
        id: `rb-${b.id}`,
        target: `bot:${b.id}`,
        targetTitle: b.label,
        targetDomain: 'software',
        predicate: 'managed by',
        direction: 'in' as const,
      }));
  }, [topologyData, selectedId]);

  if (isLoading) {
    return (
      <div className="topology-view">
        <PageHeader eyebrow="" title="Loading topology…" />
      </div>
    );
  }

  if (error || !topologyData) {
    return (
      <div className="topology-view">
        <PageHeader
          eyebrow=""
          title="Failed to load topology"
          subtitle={error?.message ?? 'Unknown error'}
        />
      </div>
    );
  }

  const degraded = topologyData.degraded;
  const dataSource = topologyData.source;

  return (
    <div className="topology-view">
      <PageHeader
        eyebrow={
          (<span className="eyebrow-row">
            <Chip variant="violet">topology · agents</Chip>
            <span className="mono-meta">
              {topologyData.bots.length} bots · {topologyData.hosts.length} hosts
            </span>
          </span>) as unknown as string
        }
        idChip="/cluster/asgard/topology"
        title="Topology"
        subtitle="Agent mesh and the hosts they operate. Drag to pan, scroll to zoom, click a node to inspect."
        actions={
          <Button variant="secondary" size="sm">
            <Icon name="refresh" size={13} />
            Re-layout
          </Button>
        }
      />

      {degraded && degraded.length > 0 && (
        <AlertStrip
          alerts={[{ id: 'degradation', severity: 'warn', message: `Partial Data: ${degraded.join(', ')} are temporarily unavailable. Showing ${dataSource === 'mock' ? 'fabricated sample data' : 'cached data'}.` }]}
          style={{ marginBottom: '24px' }}
        />
      )}

      <div className="topology-container">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedId}
          onNodeSelect={setSelectedId}
          renderNode={renderNode}
          layout="manual"
          className="graph-canvas-topology"
        />
        <GraphInspector
          node={inspectorNode}
          relationships={relationships}
          onNodeSelect={setSelectedId}
          className="graph-inspector-topology"
        />
      </div>
    </div>
  );
};
