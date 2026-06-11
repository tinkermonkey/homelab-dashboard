import React, { useMemo } from 'react';
import type { TopologyBot } from '@homelab/shared';
import { PageHeader, Chip, Button } from '@tinkermonkey/heimdall-ui';
import { useNavigate } from 'react-router-dom';
import { useCluster, useTopology } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { DegradationBanner } from '../shared/DegradationBanner';
import { BotCard } from './BotCard';

export const BotsView: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCluster();
  const { data: topologyData } = useTopology();

  const topologyBotMap = useMemo(() => {
    const m: Record<string, TopologyBot> = {};
    topologyData?.bots.forEach(b => { m[b.id] = b; });
    return m;
  }, [topologyData]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !data) return <div style={{ padding: 24 }}>Error loading bots data</div>;

  const bots = data.bots ?? [];

  return (
    <>
      <PageHeader
        eyebrow={
          (<span className="eyebrow-row">
            <Chip variant="amber">agents · {bots.length}</Chip>
            <span className="mono-meta">claude · sonnet + haiku</span>
          </span>) as unknown as string
        }
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
      <div className="grid-2">
        {bots.map(b => (
          <BotCard key={b.id} bot={b} topologyBot={topologyBotMap[b.id]} />
        ))}
      </div>
    </>
  );
};
