import React from 'react';
import { usePersistedState } from '../../utils/localStorage';
import { useTopology } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { TopologyStage } from './TopologyStage';
import { BotInspector } from './BotInspector';
import './TopologyView.css';

export const TopologyView: React.FC = () => {
  const [selectedBotId, setSelectedBotId] = usePersistedState<string>('selectedTopologyBot', 'lab-bot');
  const { data: topologyData, isLoading, error } = useTopology();

  if (isLoading) {
    return (
      <div className="topology-view">
        <div className="page-header">
          <div className="page-header__main">
            <h1 className="page-header__title">Loading topology...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topologyData) {
    return (
      <div className="topology-view">
        <div className="page-header">
          <div className="page-header__main">
            <h1 className="page-header__title">Failed to load topology</h1>
            <p className="page-header__subtitle">{error?.message || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedBot = topologyData.bots.find(b => b.id === selectedBotId) || topologyData.bots[0];

  return (
    <div className="topology-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__main">
          <div className="page-header__breadcrumb">
            <span className="breadcrumb-chip breadcrumb-chip--violet">
              <span className="breadcrumb-dot" />
              topology · {topologyData.bots.length} bots
            </span>
            <span className="breadcrumb-meta">bots · sidecar mcp servers · managed projects</span>
          </div>
          <h1 className="page-header__title">Bot topology</h1>
          <p className="page-header__subtitle">
            Where each bot runs, what MCP sidecars it brings, and which projects it manages. Curves show delegation between bots — the orchestrator fans out to specialists.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--sm btn--ghost btn--icon-label">
            <Icon name="refresh" size={13} />
            Refresh
          </button>
          <button className="btn btn--sm btn--ghost btn--icon-label">
            <Icon name="ext" size={13} />
            Export DOT
          </button>
        </div>
      </div>

      {/* Topology Stage with Inspector */}
      <div className="topology-container">
        <TopologyStage bots={topologyData.bots} selectedBotId={selectedBotId} onSelectBot={setSelectedBotId} />
        <BotInspector bot={selectedBot} />
      </div>
    </div>
  );
};
