import React from 'react';
import type { Gateway } from '@homelab/shared';
import { Panel, KVGrid, LineChart, Chip, Button } from '@tinkermonkey/heimdall-ui';
import { Icon } from '@tinkermonkey/heimdall-ui';

interface GatewayPanelProps {
  gateway: Gateway;
}

export const GatewayPanel: React.FC<GatewayPanelProps> = ({ gateway }) => {
  const statusTone = gateway.status === 'degraded' ? 'amber' : gateway.status === 'offline' ? 'rose' : 'emerald';

  const kvRows = [
    { key: 'ISP', value: gateway.isp || '—' },
    { key: 'ASN', value: gateway.asn || '—' },
    { key: 'Public IP', value: gateway.publicIp ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{gateway.publicIp} <span className="tag-pill">↗ ipv4</span></span> : '—' },
    { key: 'Ping', value: gateway.pingMs != null ? `${gateway.pingMs} ms` : '—' },
    { key: 'WWW latency', value: gateway.wwwLatencyMs != null ? `${gateway.wwwLatencyMs} ms` : '—' },
    { key: 'Clients', value: gateway.clientsTotal != null ? `${gateway.clientsTotal}` : '—' },
  ];

  return (
    <Panel
      className="panel-flush"
      title="Internet connection"
      subtitle={gateway.hostname}
      headerAction={
        <div className="row" style={{ gap: 8 }}>
          <Chip variant={statusTone}>{gateway.status}</Chip>
          <Button variant="ghost" size="sm">
            <Icon name="arrowRight" size={13} />
            Run speedtest
          </Button>
        </div>
      }
    >
      <div className="gw-split">
        <div className="gw-left">
          <KVGrid rows={kvRows} />
        </div>
        <div className="gw-right">
          <div>
            <div className="gw-charthead">
              <span className="t">Throughput · 24h</span>
              <span className="v">↓ {gateway.downMbps} · ↑ {gateway.upMbps} Mbps</span>
            </div>
            <LineChart
              series={[gateway.downHist, gateway.upHist]}
              colors={['#22d3ee', '#8b5cf6']}
              area
              style={{ width: '100%', height: 92 }}
            />
          </div>
          <div>
            <div className="gw-charthead">
              <span className="t">Latency · 24h</span>
              <span className="v">{gateway.pingMs} ms</span>
            </div>
            <LineChart
              series={[gateway.pingHist]}
              colors={['#f59e0b']}
              area
              style={{ width: '100%', height: 72 }}
            />
          </div>
        </div>
      </div>

      <div className="gw-strip">
        <div>
          <span className="k">Download</span>
          <span className="v">{gateway.downMbps} Mbps</span>
          <span className="m">wan link</span>
        </div>
        <div>
          <span className="k">Upload</span>
          <span className="v">{gateway.upMbps} Mbps</span>
          <span className="m">wan link</span>
        </div>
        <div>
          <span className="k">Gateway load</span>
          <span className="v">{gateway.cpuPct != null ? `${gateway.cpuPct}%` : '—'}</span>
          <span className="m">{gateway.memPct != null ? `mem ${gateway.memPct}%` : 'cpu'}</span>
        </div>
        <div>
          <span className="k">VPN peers</span>
          <span className="v">{gateway.vpnPeersActive}/{gateway.vpnPeers}</span>
          <span className="m">wireguard</span>
        </div>
      </div>
    </Panel>
  );
};
