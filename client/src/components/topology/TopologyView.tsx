import React from 'react';
import { usePersistedState } from '../../utils/localStorage';
import { Icon } from '../shared/Icon';
import type { TOPOLOGY_DATA } from '@homelab/shared';
import { TopologyStage } from './TopologyStage';
import { BotInspector } from './BotInspector';
import './TopologyView.css';

const MOCK_TOPOLOGY_DATA: TOPOLOGY_DATA = {
  hosts: ['nyx', 'helios', 'aether', 'vega'],
  bots: [
    {
      id: 'lab-bot',
      label: 'lab-bot',
      role: 'orchestrator',
      host: 'nyx',
      model: 'claude-sonnet-4',
      desc: 'concierge · plans + delegates · synthesises summaries',
      avatar: 'LB',
      status: 'idle',
      mcps: [
        { id: 'orch-mcp', label: 'orchestrator-mcp', ver: '0.3.1', kind: 'native', desc: 'fan-out / fan-in across bots' },
        { id: 'calendar-mcp', label: 'calendar-mcp', ver: '0.2.0', kind: 'remote', desc: 'caldav · maintenance windows' },
        { id: 'slack-mcp', label: 'slack-mcp', ver: '0.4.2', kind: 'remote', desc: 'post to #lab + mention you' },
        { id: 'notes-mcp', label: 'notes-mcp', ver: '0.1.4', kind: 'native', desc: 'persistent runbook · markdown' },
      ],
      delegates: ['ops-bot', 'watch-bot', 'sync-bot'],
      manages: [],
    },
    {
      id: 'ops-bot',
      label: 'ops-bot',
      role: 'sudoer',
      host: 'nyx',
      model: 'claude-sonnet-4',
      desc: 'infra ops · containerd / systemd · gated approvals',
      avatar: 'OP',
      status: 'busy',
      mcps: [
        { id: 'docker-mcp', label: 'docker-mcp', ver: '0.5.0', kind: 'native', desc: 'compose · inspect · logs' },
        { id: 'ssh-mcp', label: 'ssh-mcp', ver: '0.6.2', kind: 'native', desc: 'multi-host shell · audited' },
        { id: 'systemd-mcp', label: 'systemd-mcp', ver: '0.2.0', kind: 'native', desc: 'unit start/stop · journalctl' },
        { id: 'secrets-mcp', label: 'secrets-mcp', ver: '0.3.4', kind: 'remote', desc: 'sops + age · read-only' },
      ],
      delegates: [],
      manages: [
        { name: 'traefik', host: 'aether', port: '443' },
        { name: 'caddy', host: 'nyx', port: '80' },
        { name: 'registry', host: 'aether', port: '5000' },
        { name: 'gitea', host: 'aether', port: '3232' },
        { name: 'drone-ci', host: 'aether', port: '8089' },
        { name: 'comfyui', host: 'vega', port: '8188' },
      ],
    },
    {
      id: 'watch-bot',
      label: 'watch-bot',
      role: 'alerts',
      host: 'aether',
      model: 'claude-haiku-4',
      desc: 'reads metrics · raises anomalies · escalates',
      avatar: 'WB',
      status: 'ok',
      mcps: [
        { id: 'prometheus-mcp', label: 'prometheus-mcp', ver: '0.4.0', kind: 'native', desc: 'promql · alert rules' },
        { id: 'loki-mcp', label: 'loki-mcp', ver: '0.3.1', kind: 'native', desc: 'logql · stream tail' },
        { id: 'alertmanager-mcp', label: 'alertmanager-mcp', ver: '0.2.0', kind: 'native', desc: 'silence · escalate · group' },
      ],
      delegates: [],
      manages: [
        { name: 'grafana', host: 'nyx', port: '3000' },
        { name: 'prometheus', host: 'nyx', port: '9090' },
        { name: 'loki', host: 'nyx', port: '3100' },
        { name: 'alertmanager', host: 'nyx', port: '9093' },
      ],
    },
    {
      id: 'sync-bot',
      label: 'sync-bot',
      role: 'backup',
      host: 'helios',
      model: 'claude-haiku-4',
      desc: 'snapshots · integrity · cold storage',
      avatar: 'SB',
      status: 'ok',
      mcps: [
        { id: 'restic-mcp', label: 'restic-mcp', ver: '0.6.1', kind: 'native', desc: 'restic backup · prune · check' },
        { id: 'zfs-mcp', label: 'zfs-mcp', ver: '0.2.0', kind: 'native', desc: 'snapshot · send · receive' },
        { id: 's3-mcp', label: 's3-mcp', ver: '0.4.0', kind: 'remote', desc: 'backblaze b2 · sync up' },
      ],
      delegates: [],
      manages: [
        { name: 'restic-server', host: 'helios', port: '8000' },
        { name: 'minio', host: 'helios', port: '9001' },
        { name: 'nextcloud', host: 'helios', port: '9000' },
        { name: 'paperless-ngx', host: 'helios', port: '8000' },
        { name: 'vaultwarden', host: 'helios', port: '8222' },
      ],
    },
  ],
};

export const TopologyView: React.FC = () => {
  const [selectedBotId, setSelectedBotId] = usePersistedState<string>('selectedTopologyBot', 'lab-bot');
  const topologyData = MOCK_TOPOLOGY_DATA;
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
