import React, { useCallback } from 'react';
import { GraphCanvas, GraphInspector, TopologyNode, PageHeader, type GraphNodeData, type GraphEdgeData } from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from '../../utils/localStorage';
import { useTopology } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { DegradationBanner } from '../shared/DegradationBanner';
import './TopologyView.css';

const TP_BOT_LAYOUT: Record<string, { x: number; y: number }> = {
  'lab-bot': { x: 150, y: 200 },
  'ops-bot': { x: 150, y: 500 },
  'sync-bot': { x: 450, y: 200 },
  'watch-bot': { x: 750, y: 200 },
};

const HOST_TINT: Record<string, string> = {
  nyx: 'cyan',
  helios: 'emerald',
  aether: 'violet',
  vega: 'amber',
};

export const TopologyView: React.FC = () => {
  const [selectedBotId, setSelectedBotId] = usePersistedState<string>('selectedTopologyBot', 'lab-bot');
  const { data: topologyData, isLoading, error } = useTopology();

  // Render TopologyNode for each node
  const renderNode = useCallback((node: GraphNodeData) => {
    if (!topologyData) return null;
    const bot = topologyData.bots.find(b => b.id === node.id);
    if (!bot) return null;

    const statusMap: Record<string, 'ok' | 'warning' | 'error' | 'idle'> = {
      ok: 'ok',
      busy: 'warning',
      idle: 'idle',
    };

    return (
      <TopologyNode
        title={bot.label}
        role={bot.role}
        status={statusMap[bot.status] || 'idle'}
      />
    );
  }, [topologyData]);

  if (isLoading) {
    return (
      <div className="topology-view">
        <PageHeader eyebrow="" title="Loading topology..." />
      </div>
    );
  }

  if (error || !topologyData) {
    return (
      <div className="topology-view">
        <PageHeader
          eyebrow=""
          title="Failed to load topology"
          subtitle={error?.message || 'Unknown error'}
        />
      </div>
    );
  }

  const selectedBot = topologyData.bots.find(b => b.id === selectedBotId) || topologyData.bots[0];
  const degraded = (topologyData as typeof topologyData & { degraded?: string[] }).degraded;
  const dataSource = (topologyData as typeof topologyData & { source?: 'real' | 'mock' }).source;

  // Convert TopologyBot[] to GraphNodeData[]
  const nodes: GraphNodeData[] = topologyData.bots.map(bot => ({
    id: bot.id,
    label: bot.label,
    kind: bot.role,
    domainColor: HOST_TINT[bot.host],
    x: TP_BOT_LAYOUT[bot.id]?.x,
    y: TP_BOT_LAYOUT[bot.id]?.y,
  }));

  // Create edges for delegation relationships
  const edges: GraphEdgeData[] = [];
  const labBot = topologyData.bots.find(b => b.id === 'lab-bot');
  if (labBot?.delegates) {
    labBot.delegates.forEach(delegateId => {
      edges.push({
        id: `${labBot.id}->${delegateId}`,
        sourceId: labBot.id,
        targetId: delegateId,
        label: 'delegates',
      });
    });
  }


  // Prepare GraphInspector data
  const inspectorNode = selectedBot ? {
    id: selectedBot.id,
    title: selectedBot.label,
    kind: selectedBot.role,
    domain: HOST_TINT[selectedBot.host],
    description: selectedBot.desc,
    metadata: {
      model: selectedBot.model,
      host: `${selectedBot.host}.lab.local`,
      status: selectedBot.status,
      mcps: `${selectedBot.mcps.length} attached`,
      manages: `${selectedBot.manages.length} project${selectedBot.manages.length === 1 ? '' : 's'}`,
      ...(selectedBot.delegates.length > 0 && {
        delegates: `${selectedBot.delegates.length} bot${selectedBot.delegates.length === 1 ? '' : 's'}`,
      }),
    },
  } : null;

  // Build relationship links for inspector
  const relationships = selectedBot ? [
    ...selectedBot.mcps.map(mcp => ({
      id: `mcp-${mcp.id}`,
      target: mcp.id,
      targetTitle: mcp.label,
      targetDomain: 'mcp' as const,
      predicate: `sidecar (${mcp.kind})`,
      direction: 'out' as const,
    })),
    ...selectedBot.manages.map(proj => ({
      id: `manage-${proj.name}`,
      target: proj.name,
      targetTitle: proj.name,
      targetDomain: proj.host,
      predicate: `manages (${proj.host}:${proj.port})`,
      direction: 'out' as const,
    })),
    ...selectedBot.delegates.map(delegateId => ({
      id: `delegate-${delegateId}`,
      target: delegateId,
      targetTitle: delegateId,
      targetDomain: 'orchestrator',
      predicate: 'delegates to',
      direction: 'out' as const,
    })),
  ] : [];

  return (
    <div className="topology-view">
      <PageHeader
        eyebrow="bots · sidecar mcp servers · managed projects"
        idChip={`${topologyData.bots.length} bots`}
        title="Bot topology"
        subtitle="Where each bot runs, what MCP sidecars it brings, and which projects it manages. Curves show delegation between bots — the orchestrator fans out to specialists."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--sm btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="refresh" size={13} />
              Refresh
            </button>
            <button className="btn btn--sm btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="ext" size={13} />
              Export DOT
            </button>
          </div>
        }
      />

      <DegradationBanner degraded={degraded} dataSource={dataSource} />

      <div className="topology-container">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedBotId}
          onNodeSelect={setSelectedBotId}
          renderNode={renderNode}
          layout="manual"
          className="graph-canvas-topology"
        />
        <GraphInspector
          node={inspectorNode}
          relationships={relationships}
          onNodeSelect={setSelectedBotId}
          className="graph-inspector-topology"
        />
      </div>
    </div>
  );
};
