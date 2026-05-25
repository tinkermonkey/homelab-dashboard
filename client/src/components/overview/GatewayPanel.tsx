import React from 'react';
import type { Gateway } from '@homelab/shared';
import { ProgressBar } from '@tinkermonkey/heimdall-ui';
import { Icon } from '../shared/Icon';
import { GatewayChart } from './GatewayChart';

interface GatewayPanelProps {
  gateway: Gateway;
}

export const GatewayPanel: React.FC<GatewayPanelProps> = ({ gateway }) => {
  const wlanErr = gateway.wlanStatus === 'error';
  const lanErr = gateway.lanStatus === 'error';

  const statusTone =
    gateway.status === 'degraded' ? 'amber' :
    gateway.status === 'offline'  ? 'rose'  : 'emerald';

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">
          <Icon name="globe" size={16} />
          Internet connection
          <span className="panel-sub">{gateway.hostname}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`chip ${statusTone}`}>
            <span className="dot" />
            {gateway.status}
          </span>
          {wlanErr && <span className="chip amber">WLAN</span>}
          {lanErr  && <span className="chip amber">LAN</span>}
        </div>
      </div>

      <div className="panel-body flush">
        <div className="gw-split">
          <div className="gw-left">
            <div className="gw-eyebrow">Connection · {gateway.plan}</div>
            <div className="kv">
              <div className="k">ISP</div>
              <div className="v">{gateway.isp}</div>
              <div className="k">ASN</div>
              <div className="v">{gateway.asn}</div>
              <div className="k">Public IP</div>
              <div className="v">
                {gateway.publicIp}
                <span className="flag">↗ ipv4</span>
              </div>
              <div className="k">Geo</div>
              <div className="v">{gateway.geo}</div>
              <div className="k">WAN iface</div>
              <div className="v">{gateway.wanIf}</div>
              <div className="k">Ping</div>
              <div className="v">{gateway.pingMs} ms · jitter {gateway.jitterMs} ms</div>
              <div className="k">Loss 24h</div>
              <div className="v">{gateway.lossPct.toFixed(2)} %</div>
              <div className="k">Uptime</div>
              <div className="v">{gateway.statusFor}</div>
              {gateway.wwwLatencyMs != null && (
                <>
                  <div className="k">WWW latency</div>
                  <div className="v">{gateway.wwwLatencyMs} ms</div>
                </>
              )}
              {gateway.clientsTotal != null && (
                <>
                  <div className="k">Clients</div>
                  <div className="v">{gateway.clientsTotal}</div>
                </>
              )}
            </div>

            {(gateway.cpuPct != null || gateway.memPct != null) && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {gateway.cpuPct != null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="gw-eyebrow" style={{ marginBottom: 0 }}>ROUTER CPU</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{gateway.cpuPct.toFixed(1)}%</span>
                    </div>
                    <ProgressBar
                      percent={gateway.cpuPct}
                      color={gateway.cpuPct >= 90 ? 'rose' : gateway.cpuPct >= 70 ? 'amber' : 'emerald'}
                    />
                  </div>
                )}
                {gateway.memPct != null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="gw-eyebrow" style={{ marginBottom: 0 }}>ROUTER MEM</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{gateway.memPct.toFixed(1)}%</span>
                    </div>
                    <ProgressBar
                      percent={gateway.memPct}
                      color={gateway.memPct >= 90 ? 'rose' : gateway.memPct >= 80 ? 'amber' : 'emerald'}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="gw-right">
            <div className="gw-charts">
              <GatewayChart
                downHist={gateway.downHist}
                upHist={gateway.upHist}
                pingHist={gateway.pingHist}
                currentDown={gateway.downMbps}
                currentUp={gateway.upMbps}
                currentPing={gateway.pingMs}
              />
            </div>
          </div>
        </div>

        <div className="gw-stat-strip">
          <div>
            <span className="k">Egress · today</span>
            <span className="v">{gateway.egressTodayGB.toFixed(1)} GB</span>
            <span className="m">↑ {gateway.egressMonthTB.toFixed(2)} TB this month</span>
          </div>
          <div>
            <span className="k">Ingress · today</span>
            <span className="v">{gateway.ingressTodayGB.toFixed(1)} GB</span>
            <span className="m">↓ {gateway.downMbps} Mbps now</span>
          </div>
          <div>
            <span className="k">DNS · blocked</span>
            <span className="v">{gateway.blockedPct}%</span>
            <span className="m">{gateway.dnsBlocked.toLocaleString()} of {gateway.dnsResolved.toLocaleString()}</span>
          </div>
          <div>
            <span className="k">VPN peers</span>
            <span className="v">{gateway.vpnPeersActive} / {gateway.vpnPeers}</span>
            <span className="m">active tunnels</span>
          </div>
        </div>
      </div>
    </div>
  );
};

