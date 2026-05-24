import React, { useState } from 'react';
import { ActivityTimeline } from '@tinkermonkey/heimdall-ui';
import type { IpsEvent, NetworkEvent } from '@homelab/shared';

interface NetworkEventsPanelProps {
  ipsEvents: IpsEvent[];
  events: NetworkEvent[];
  degraded: string[];
}

type Tab = 'network' | 'ips';

const IPS_UNAVAILABLE = 'udm-ips';
const EVENTS_UNAVAILABLE = 'udm-events';

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export const NetworkEventsPanel: React.FC<NetworkEventsPanelProps> = ({ ipsEvents, events, degraded }) => {
  const [tab, setTab] = useState<Tab>('network');

  const ipsUnavailable = degraded.includes(IPS_UNAVAILABLE);
  const eventsUnavailable = degraded.includes(EVENTS_UNAVAILABLE);

  const activityEvents = events.map(e => ({
    id: e.id,
    type: e.type,
    subject: e.subject,
    timestamp: new Date(e.timestamp),
  }));

  return (
    <>
      <div className="event-feed__tabs">
        <button
          className={`event-feed__tab ${tab === 'network' ? 'event-feed__tab--active' : ''}`}
          onClick={() => setTab('network')}
        >
          Network Events
        </button>
        <button
          className={`event-feed__tab ${tab === 'ips' ? 'event-feed__tab--active' : ''}`}
          onClick={() => setTab('ips')}
        >
          IPS Alerts
        </button>
      </div>

      {tab === 'network' && (
        eventsUnavailable ? (
          <div className="event-feed__unavailable">
            <span className="event-feed__unavailable-label">Unavailable</span>
            <span>UDM events endpoint returning 404 — site-slug bug pending fix</span>
          </div>
        ) : (
          <ActivityTimeline
            events={activityEvents}
            emptyState="No recent network events"
          />
        )
      )}

      {tab === 'ips' && (
        ipsUnavailable ? (
          <div className="event-feed__unavailable">
            <span className="event-feed__unavailable-label">Unavailable</span>
            <span>UDM IPS endpoint returning 404 — site-slug bug pending fix in homelab-data-mcp</span>
          </div>
        ) : ipsEvents.length === 0 ? (
          <div className="network-empty">No IPS events detected</div>
        ) : (
          <div className="ips-event-list">
            {ipsEvents.map(e => (
              <div key={e.id} className="ips-event">
                <span className={`ips-event__severity ips-event__severity--${e.severity}`}>
                  {e.severity}
                </span>
                <div className="ips-event__body">
                  <span className="ips-event__message" title={e.message}>{e.message || e.category}</span>
                  <span className="ips-event__meta">{e.srcIp} → {e.dstIp}</span>
                </div>
                <span className="ips-event__time">{formatTimestamp(e.timestamp)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
};
