import React, { useCallback, useMemo } from 'react';
import {
  GraphCanvas, GraphInspector, TopologyNode, PageHeader, Chip, Button, AlertStrip,
  type GraphNodeData, type GraphEdgeData,
} from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from '../../utils/localStorage';
import { asEyebrow } from '../../utils/pageHeader';
import { useTopology, useCluster } from '../../hooks/useAPI';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { getRoleColor } from '../../utils/hostUtils';
import './TopologyView.css';

const HOST_LAYOUT: Record<string, { x: number; y: number }> = {
  nyx: { x: 600, y: 400 },
  helios: { x: 750, y: 400 },
  aether: { x: 900, y: 400 },
  vega: { x: 1050, y: 400 },
};

const NO_EDGES: GraphEdgeData[] = [];

export const TopologyView: React.FC = () => {
  const [selectedId, setSelectedId] = usePersistedState<string>('selectedTopologyHost', '');
  const { data: topologyData, isLoading, error } = useTopology();
  const { data: clusterData } = useCluster();

  const serverMap = useMemo(() => {
    const m: Record<string, { role: string }> = {};
    clusterData?.servers.forEach(s => { m[s.id] = { role: s.role }; });
    return m;
  }, [clusterData?.servers]);

  const nodes = useMemo((): GraphNodeData[] => {
    if (!topologyData) return [];
    return topologyData.hosts.map(hid => ({
      id: `host:${hid}`,
      label: hid,
      kind: 'host',
      domainColor: getRoleColor(serverMap[hid]?.role ?? 'compute'),
      x: HOST_LAYOUT[hid]?.x,
      y: HOST_LAYOUT[hid]?.y,
    }));
  }, [topologyData, serverMap]);

  const renderNode = useCallback((node: GraphNodeData) => {
    const s = serverMap[node.label];
    return (
      <TopologyNode
        title={node.label}
        nodeRole={s?.role ?? 'host'}
        status="ok"
        onSelect={() => setSelectedId(node.id)}
      />
    );
  }, [serverMap, setSelectedId]);

  const inspectorNode = useMemo(() => {
    if (!topologyData || !selectedId.startsWith('host:')) return null;
    const hid = selectedId.slice(5);
    if (!topologyData.hosts.includes(hid)) return null;
    const s = serverMap[hid];
    return {
      id: `${hid}.lab.local`,
      title: hid,
      kind: 'host' as const,
      domain: getRoleColor(s?.role ?? 'compute'),
      description: `${s?.role ?? 'host'} node`,
      metadata: { role: s?.role ?? '—' },
    };
  }, [topologyData, selectedId, serverMap]);

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
          asEyebrow(<span className="eyebrow-row">
            <Chip variant="violet">topology · hosts</Chip>
            <span className="mono-meta">{topologyData.hosts.length} hosts</span>
          </span>)
        }
        idChip={`/cluster/${(clusterData?.cluster?.name ?? 'cluster').toLowerCase()}/topology`}
        title="Topology"
        subtitle="Cluster hosts and their roles. Drag to pan, scroll to zoom, click a node to inspect."
        actions={
          <Button variant="secondary" size="sm">
            <Icon name="reload" size={13} />
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
          edges={NO_EDGES}
          selectedNodeId={selectedId}
          onNodeSelect={setSelectedId}
          renderNode={renderNode}
          layout="manual"
          className="graph-canvas-topology"
        />
        <GraphInspector
          node={inspectorNode}
          relationships={[]}
          onNodeSelect={setSelectedId}
          className="graph-inspector-topology"
        />
      </div>
    </div>
  );
};
