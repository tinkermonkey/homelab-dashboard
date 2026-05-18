import React, { useState } from 'react';
import type { DOCKER_DATA } from '@homelab/shared';
import { useDocker } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { ContainersTab } from './ContainersTab';
import { NetworksTab } from './NetworksTab';
import { VolumesTab } from './VolumesTab';
import './ContainersView.css';

export const ContainersView: React.FC = () => {
  const { data, isLoading, error } = useDocker();
  const [activeTab, setActiveTab] = useState<'containers' | 'networks' | 'volumes'>('containers');
  const [hostFilter, setHostFilter] = useState('all');
  const [query, setQuery] = useState('');

  const dockerData = data as (DOCKER_DATA & { degraded?: string[] }) | undefined;

  if (isLoading) {
    return <div className="containers-view">Loading...</div>;
  }

  if (error || !dockerData) {
    return <div className="containers-view">Error loading Docker data</div>;
  }

  const totalContainers = dockerData.hosts.reduce((a, h) => a + h.containers.length, 0);
  const runningContainers = dockerData.hosts.reduce(
    (a, h) => a + h.containers.filter(c => c.state === 'running').length,
    0
  );
  const totalNetworks = dockerData.hosts.reduce((a, h) => a + h.networks.length, 0);
  const totalVolumes = dockerData.hosts.reduce((a, h) => a + h.volumes.length, 0);

  const filteredHosts = hostFilter === 'all' ? dockerData.hosts : dockerData.hosts.filter(h => h.id === hostFilter);

  return (
    <div className="containers-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__main">
          <div className="page-header__breadcrumb">
            <span className="breadcrumb-chip breadcrumb-chip--violet">
              <span className="breadcrumb-dot" />
              docker · {dockerData.hosts.length} hosts
            </span>
            <span className="breadcrumb-meta">scraped via docker socket · every 30s</span>
          </div>
          <h1 className="page-header__title">Containers</h1>
          <p className="page-header__subtitle">
            Container runtime inventory across all hosts. Shows live containers, declared networks, and persistent
            volumes — ports and bind mounts inlined.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--sm btn--ghost btn--icon-label">
            <Icon name="refresh" size={13} />
            Refresh
          </button>
          <button className="btn btn--sm btn--primary btn--icon-label">
            <Icon name="plus" size={13} />
            Compose up…
          </button>
        </div>
      </div>

      {/* Degradation Banner */}
      {dockerData.degraded && dockerData.degraded.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Icon name="alert-triangle" size={16} style={{ color: '#F59E0B' }} />
          <div style={{ fontSize: '13px' }}>
            <strong>Partial Data:</strong> {dockerData.degraded.join(', ')} are temporarily unavailable. Showing cached data.
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar">
        <div className="tab-bar__tabs">
          <button
            className={`tab-bar__tab ${activeTab === 'containers' ? 'tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab('containers')}
          >
            <Icon name="layers" size={13} />
            <span className="tab-bar__tab-label">Containers</span>
            <span className="tab-bar__tab-count">
              {runningContainers}/{totalContainers}
            </span>
          </button>
          <button
            className={`tab-bar__tab ${activeTab === 'networks' ? 'tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab('networks')}
          >
            <Icon name="link" size={13} />
            <span className="tab-bar__tab-label">Networks</span>
            <span className="tab-bar__tab-count">{totalNetworks}</span>
          </button>
          <button
            className={`tab-bar__tab ${activeTab === 'volumes' ? 'tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab('volumes')}
          >
            <Icon name="database" size={13} />
            <span className="tab-bar__tab-label">Volumes</span>
            <span className="tab-bar__tab-count">{totalVolumes}</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="containers-toolbar">
        {activeTab === 'containers' && (
          <div className="search-input-wrapper">
            <span className="search-icon">
              <Icon name="search" size={14} />
            </span>
            <input
              className="input text-input"
              placeholder="Filter by name, image, tag…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        )}

        <div className="host-filter-chips">
          {['all', ...dockerData.hosts.map(h => h.id)].map(h => (
            <button
              key={h}
              onClick={() => setHostFilter(h)}
              className={`host-filter-chip ${hostFilter === h ? 'host-filter-chip--active' : ''}`}
            >
              {h === 'all' ? 'all hosts' : h}
              <span className="host-filter-chip__count">
                {h === 'all'
                  ? activeTab === 'containers' ? totalContainers : activeTab === 'networks' ? totalNetworks : totalVolumes
                  : (() => {
                      const host = dockerData.hosts.find(x => x.id === h);
                      if (!host) return 0;
                      return activeTab === 'containers'
                        ? host.containers.length
                        : activeTab === 'networks'
                          ? host.networks.length
                          : host.volumes.length;
                    })()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="containers-content">
        <div style={{ display: activeTab === 'containers' ? 'block' : 'none' }}>
          <ContainersTab hosts={filteredHosts} query={query} />
        </div>
        <div style={{ display: activeTab === 'networks' ? 'block' : 'none' }}>
          <NetworksTab hosts={filteredHosts} />
        </div>
        <div style={{ display: activeTab === 'volumes' ? 'block' : 'none' }}>
          <VolumesTab hosts={filteredHosts} />
        </div>
      </div>
    </div>
  );
};
