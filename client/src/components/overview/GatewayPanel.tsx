import React from 'react';
import type { Gateway } from '@homelab/shared';
import { Panel, KVGrid, LineChart, Chip, Button } from '@tinkermonkey/heimdall-ui';
import { Icon } from '../shared/Icon';

interface GatewayPanelProps {
  gateway: Gateway;
}

export const GatewayPanel: React.FC<GatewayPanelProps> = ({ gateway }) => {
  const statusTone = gateway.status === 'degraded' ? 'amber' : gateway.status === 'offline' ? 'rose' : 'emerald';

  const kvRows = [
    { key: 'ISP', value: gateway.isp },
    { key: 'ASN', value: gateway.asn },
    { key: 'Public IP', value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{gateway.publicIp} <span className="tag-pill">↗ ipv4</span></span> },
    { key: 'Geo', value: gateway.geo },
    { key: 'WAN iface', value: gateway.wanIf },
    { key: 'Ping', value: `${gateway.pingMs} ms · jitter ${gateway.jitterMs} ms` },
    { key: 'Loss 24h', value: `${gateway.lossPct.toFixed(2)} %` },
  ];

  return (
    <Panel className="panel-flush">
      {/* Custom header with action — rendered inside flush body */}
      <div className="panel__header" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="panel__title">Internet connection</div>
          <div className="panel__subtitle">{gateway.hostname} · {gateway.plan}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Chip variant={statusTone}>{gateway.status}</Chip>
          <Button variant="ghost" size="sm">
            <Icon name="zap" size={13} />
            Run speedtest
          </Button>
        </div>
      </div>

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
              <span className="v">{gateway.pingMs} ms · loss {gateway.lossPct.toFixed(2)}%</span>
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
          <span className="k">Ingress · today</span>
          <span className="v">{gateway.ingressTodayGB.toFixed(1)} GB</span>
          <span className="m">↓ {gateway.downMbps} Mbps peak</span>
        </div>
        <div>
          <span className="k">Egress · today</span>
          <span className="v">{gateway.egressTodayGB.toFixed(1)} GB</span>
          <span className="m">↑ {gateway.egressMonthTB.toFixed(2)} TB / mo</span>
        </div>
        <div>
          <span className="k">DNS · pihole</span>
          <span className="v">{gateway.dnsResolved.toLocaleString()} q</span>
          <span className="m">blocked {gateway.blockedPct}%</span>
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
