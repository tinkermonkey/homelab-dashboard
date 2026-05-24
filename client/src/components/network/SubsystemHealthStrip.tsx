import React from 'react';
import type { SubsystemHealth } from '@homelab/shared';

interface SubsystemHealthStripProps {
  subsystems: SubsystemHealth[];
}

const LABELS: Record<string, string> = {
  wan: 'WAN',
  wlan: 'WLAN',
  lan: 'LAN',
  vpn: 'VPN',
  www: 'WWW',
};

export const SubsystemHealthStrip: React.FC<SubsystemHealthStripProps> = ({ subsystems }) => {
  if (subsystems.length === 0) {
    return (
      <div className="subsystem-strip">
        {(['wan', 'wlan', 'lan', 'vpn', 'www'] as const).map(id => (
          <div key={id} className="subsystem-card">
            <div className="subsystem-card__header">
              <span className="subsystem-card__name">{LABELS[id]}</span>
              <span className="subsystem-card__dot subsystem-card__dot--warn" />
            </div>
            <span className="subsystem-card__status-text subsystem-card__status-text--warn">—</span>
            <span className="subsystem-card__details">Unavailable</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="subsystem-strip">
      {subsystems.map(s => {
        const dotClass = `subsystem-card__dot subsystem-card__dot--${s.status}`;
        const cardClass = ['subsystem-card', s.status !== 'ok' ? `subsystem-card--${s.status}` : ''].filter(Boolean).join(' ');
        const textClass = `subsystem-card__status-text subsystem-card__status-text--${s.status}`;

        return (
          <div key={s.id} className={cardClass}>
            <div className="subsystem-card__header">
              <span className="subsystem-card__name">{LABELS[s.id] ?? s.id.toUpperCase()}</span>
              <span className={dotClass} />
            </div>

            {s.latencyMs != null ? (
              <div className="subsystem-card__latency">
                {s.latencyMs}
                <span className="subsystem-card__latency-unit">ms</span>
              </div>
            ) : (
              <span className={textClass}>{s.status.toUpperCase()}</span>
            )}

            <span className="subsystem-card__details" title={s.details}>{s.details || '—'}</span>
          </div>
        );
      })}
    </div>
  );
};
