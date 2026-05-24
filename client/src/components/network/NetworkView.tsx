import React from 'react';
import { PageHeader } from '@tinkermonkey/heimdall-ui';
import { useNetwork, useCluster } from '../../hooks/useAPI';
import { DegradationBanner } from '../shared/DegradationBanner';
import { SubsystemHealthStrip } from './SubsystemHealthStrip';
import { ClientBreakdownPanel } from './ClientBreakdownPanel';
import { TopTalkersPanel } from './TopTalkersPanel';
import { GatewayHealthPanel } from './GatewayHealthPanel';
import { NetworkEventsPanel } from './NetworkEventsPanel';
import './NetworkView.css';

export const NetworkView: React.FC = () => {
  const { data: network, isLoading } = useNetwork();
  const { data: cluster } = useCluster();

  const gateway = cluster?.gateway;
  const degraded = network?.degraded ?? [];

  if (isLoading && !network) {
    return (
      <div className="network-view">
        <PageHeader
          eyebrow="homelab · network"
          idChip="network"
          title="Network"
          subtitle="Loading network data…"
        />
      </div>
    );
  }

  return (
    <div className="network-view">
      <PageHeader
        eyebrow={`homelab · network · ${(network?.clients.total ?? 0)} clients online`}
        idChip="network"
        title="Network"
        subtitle="UniFi UDM subsystem health, connected clients, top talkers, and security events."
      />

      <DegradationBanner degraded={degraded} />

      {/* Row 1: Subsystem health strip */}
      <SubsystemHealthStrip subsystems={network?.subsystems ?? []} />

      {/* Row 2: Client breakdown + Top talkers */}
      <div className="network-row network-row--2col">
        <div className="net-panel">
          <div className="net-panel__header">
            <h3 className="net-panel__title">Connected Clients</h3>
            <span className="net-panel__badge net-panel__badge--muted">
              {network?.clients.total ?? 0} total
            </span>
          </div>
          <div className="net-panel__body">
            <ClientBreakdownPanel clients={network?.clients ?? { total: 0, wired: 0, wireless: 0, topTalkers: [] }} />
          </div>
        </div>

        <div className="net-panel">
          <div className="net-panel__header">
            <h3 className="net-panel__title">Top Talkers</h3>
            <span className="net-panel__badge net-panel__badge--muted">by total data</span>
          </div>
          <div className="net-panel__body">
            <TopTalkersPanel topTalkers={network?.clients.topTalkers ?? []} />
          </div>
        </div>
      </div>

      {/* Row 3: Gateway router health + Event feed */}
      <div className="network-row network-row--2col">
        <div className="net-panel">
          <div className="net-panel__header">
            <h3 className="net-panel__title">Gateway Router</h3>
            {network?.gateway.cpuPct != null && (
              <span className={`net-panel__badge net-panel__badge--${
                network.gateway.cpuPct >= 90 ? 'error' :
                network.gateway.cpuPct >= 70 ? 'warn' : 'ok'
              }`}>
                {network.gateway.cpuPct.toFixed(0)}% CPU
              </span>
            )}
          </div>
          <div className="net-panel__body">
            <GatewayHealthPanel
              gateway={network?.gateway ?? { cpuPct: 0, memPct: 0 }}
              statusFor={gateway?.statusFor}
              wwwLatencyMs={gateway?.wwwLatencyMs}
              pingMs={gateway?.pingMs}
            />
          </div>
        </div>

        <div className="net-panel">
          <div className="net-panel__header">
            <h3 className="net-panel__title">Event Feed</h3>
            {degraded.includes('udm-ips') && degraded.includes('udm-events') && (
              <span className="net-panel__badge net-panel__badge--warn">Partial</span>
            )}
          </div>
          <div className="net-panel__body">
            <NetworkEventsPanel
              ipsEvents={network?.ipsEvents ?? []}
              events={network?.events ?? []}
              degraded={degraded}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
