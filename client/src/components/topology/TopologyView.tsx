import React from 'react';
import { PageHeader } from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from '../../utils/localStorage';
import { useTopology } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { DegradationBanner } from '../shared/DegradationBanner';
import { TopologyStage } from './TopologyStage';
import { BotInspector } from './BotInspector';
import './TopologyView.css';

export const TopologyView: React.FC = () => {
  const [selectedBotId, setSelectedBotId] = usePersistedState<string>('selectedTopologyBot', 'lab-bot');
  const { data: topologyData, isLoading, error } = useTopology();

  if (isLoading) {
    return (
      <div className="topology-view">
        <PageHeader
          eyebrow=""
          title="Loading topology..."
        />
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

  return (
    <div className="topology-view">
      {/* Page Header */}
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

      {/* Degradation Banner */}
      <DegradationBanner degraded={degraded} />

      {/* Topology Stage with Inspector */}
      <div className="topology-container">
        <TopologyStage bots={topologyData.bots} selectedBotId={selectedBotId} onSelectBot={setSelectedBotId}>
          <BotInspector bot={selectedBot} />
        </TopologyStage>
      </div>
    </div>
  );
};
