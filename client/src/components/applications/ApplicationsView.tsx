import React from 'react';
import { PageHeader, Chip, Button } from '@tinkermonkey/heimdall-ui';
import { useCluster } from '../../hooks/useAPI';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { ErrorView } from '../shared/ErrorView';
import { AppsPanel } from '../overview/AppsPanel';
import { asEyebrow } from '../../utils/pageHeader';
import { DegradationBanner } from '../shared/DegradationBanner';

export const ApplicationsView: React.FC = () => {
  const { data, isLoading, error } = useCluster();

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !data) return (
    <ErrorView
      title="Failed to Load Application Data"
      message={error instanceof Error ? error.message : 'Could not fetch cluster data. Please try again in a moment.'}
    />
  );

  const apps = data.apps ?? [];

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="cyan">services · {apps.length}</Chip>
            <span className="mono-meta">scraped every 15 s</span>
          </span>
        )}
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
