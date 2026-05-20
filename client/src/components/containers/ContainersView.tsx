import React, { useState, useMemo } from 'react';
import { PageHeader } from '@tinkermonkey/heimdall-ui';
import { useDocker } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { DegradationBanner } from '../shared/DegradationBanner';
import { ContainersTab } from './ContainersTab';
import { NetworksTab } from './NetworksTab';
import { VolumesTab } from './VolumesTab';
import { HostFilterBar } from './HostFilterBar';
import './ContainersView.css';

export const ContainersView: React.FC = () => {
  const { data, isLoading, error } = useDocker();
  const [activeTab, setActiveTab] = useState<'containers' | 'networks' | 'volumes'>('containers');
  const [hostFilter, setHostFilter] = useState('all');
  const [query, setQuery] = useState('');

  if (isLoading) {
    return <div className="containers-view">Loading...</div>;
  }

  if (error || !data) {
    return <div className="containers-view">Error loading Docker data</div>;
  }

  const totalContainers = data.hosts.reduce((a, h) => a + h.containers.length, 0);
  const runningContainers = data.hosts.reduce(
    (a, h) => a + h.containers.filter(c => c.state === 'running').length,
    0
  );
  const totalNetworks = data.hosts.reduce((a, h) => a + h.networks.length, 0);
  const totalVolumes = data.hosts.reduce((a, h) => a + h.volumes.length, 0);

  const filteredHosts = hostFilter === 'all' ? data.hosts : data.hosts.filter(h => h.id === hostFilter);
  const degraded = data.degraded;
  const dataSource = data.source;

  const getHostCount = (hostId: string) => {
    if (hostId === 'all') {
      return activeTab === 'containers' ? totalContainers : activeTab === 'networks' ? totalNetworks : totalVolumes;
    }
    const host = data.hosts.find(h => h.id === hostId);
    if (!host) return 0;
    return activeTab === 'containers'
      ? host.containers.length
      : activeTab === 'networks'
        ? host.networks.length
        : host.volumes.length;
  };

  const hostFilterChips = useMemo(() => {
    return [
      { id: 'all', label: 'all hosts', count: getHostCount('all') },
      ...data.hosts.map(h => ({ id: h.id, label: h.id, count: getHostCount(h.id) }))
    ];
  }, [data.hosts, activeTab, totalContainers, totalNetworks, totalVolumes]);

  return (
    <div className="containers-view">
      {/* Page Header */}
      <PageHeader
        eyebrow="scraped via docker socket · every 30s"
        idChip={`${data.hosts.length} hosts`}
        title="Containers"
        subtitle="Container runtime inventory across all hosts. Shows live containers, declared networks, and persistent volumes — ports and bind mounts inlined."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--sm btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="refresh" size={13} />
              Refresh
            </button>
            <button className="btn btn--sm btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="plus" size={13} />
              Compose up…
            </button>
          </div>
        }
      />

      {/* Degradation Banner */}
      <DegradationBanner degraded={degraded} dataSource={dataSource} />

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

      {/* Host Filter Bar (Search for containers, Host selection for all tabs) */}
      <HostFilterBar
        hostFilters={hostFilterChips}
        selectedHost={hostFilter}
        onHostSelect={setHostFilter}
        {...(activeTab === 'containers' && {
          searchPlaceholder: 'Filter by name, image, tag…',
          onSearchChange: setQuery,
        })}
      />

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
