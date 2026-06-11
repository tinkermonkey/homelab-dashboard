import React from 'react';
import { PageHeader, Chip, Button } from '@tinkermonkey/heimdall-ui';
import { useCluster } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { DegradationBanner } from '../shared/DegradationBanner';
import { AppsPanel } from '../overview/AppsPanel';

export const ApplicationsView: React.FC = () => {
  const { data, isLoading, error } = useCluster();

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !data) return <div style={{ padding: 24 }}>Error loading application data</div>;

  const apps = data.apps ?? [];

  return (
    <>
      <PageHeader
        eyebrow={
          (<span className="eyebrow-row">
            <Chip variant="cyan">services · {apps.length}</Chip>
            <span className="mono-meta">scraped every 15 s</span>
          </span>) as unknown as string
        }
        idChip="/cluster/asgard/apps"
        title="Applications"
        subtitle="Every service deployed across the cluster, by category."
        actions={
          <Button variant="primary" size="sm">
            <Icon name="plus" size={13} />
            New service
          </Button>
        }
      />
      <DegradationBanner degraded={data?.degraded} />
      <AppsPanel apps={apps} />
    </>
  );
};
