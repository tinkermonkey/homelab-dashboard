import React, { useMemo } from 'react';
import type { TopologyBot } from '@homelab/shared';
import { PageHeader, Chip, Button, AlertStrip } from '@tinkermonkey/heimdall-ui';
import { useNavigate } from 'react-router-dom';
import { useCluster, useTopology } from '../../hooks/useAPI';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { ErrorView } from '../shared/ErrorView';
import { BotCard } from './BotCard';
import { asEyebrow } from '../../utils/pageHeader';
import { DegradationBanner } from '../shared/DegradationBanner';

export const BotsView: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCluster();
  const { data: topologyData, error: topologyError } = useTopology();

  const topologyBotMap = useMemo(() => {
    const m: Record<string, TopologyBot> = {};
    topologyData?.bots.forEach(b => { m[b.id] = b; });
    return m;
  }, [topologyData]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !data) return (
    <ErrorView
      title="Failed to Load Bots Data"
      message={error instanceof Error ? error.message : 'Could not fetch cluster data. Please try again in a moment.'}
    />
  );

  const bots = data.bots ?? [];

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="amber">agents · {bots.length}</Chip>
            <span className="mono-meta">claude · sonnet + haiku</span>
          </span>
        )}
        idChip="/cluster/asgard/bots"
        title="Bots"
        subtitle="The agent mesh that operates the homelab. Open topology to see how they relate."
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/cluster/topology')}>
            <Icon name="graph" size={13} />
            View topology
          </Button>
        }
      />
      <DegradationBanner degraded={data?.degraded} />
      {topologyError && (
        <AlertStrip
          alerts={[{ id: 'topology-error', severity: 'warn', message: 'Agent topology data unavailable. MCP server counts may be incomplete.' }]}
          style={{ marginBottom: '24px' }}
        />
      )}
      <div className="grid-2">
        {bots.map(b => (
          <BotCard key={b.id} bot={b} topologyBot={topologyBotMap[b.id]} />
        ))}
      </div>
    </>
  );
};
