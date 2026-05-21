import React, { useState, useMemo } from 'react';
import type { App } from '@homelab/shared';
import './AppsSection.css';

interface AppsSectionProps {
  apps: App[];
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'media', label: 'Media' },
  { id: 'iot', label: 'IoT' },
  { id: 'ai', label: 'AI' },
  { id: 'storage', label: 'Storage' },
  { id: 'dev', label: 'Dev' },
  { id: 'obs', label: 'Observability' },
  { id: 'net', label: 'Network' },
];

const HOST_COLORS: Record<string, string> = {
  't5610': 'rgb(var(--host-t5610-tint))',
  'petit-cochon': 'rgb(var(--host-petit-cochon-tint))',
  'hp7052': 'rgb(var(--host-hp7052-tint))',
};

const STATUS_COLORS: Record<string, string> = {
  running: 'rgb(var(--status-ok))',
  degraded: 'rgb(var(--status-warn))',
  failed: 'rgb(var(--status-error))',
  stopped: 'rgb(var(--status-neutral))',
  updating: 'rgb(var(--status-cyan))',
};

export const AppsSection: React.FC<AppsSectionProps> = ({ apps }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredApps = useMemo(() => {
    if (selectedCategory === 'all') return apps;
    return apps.filter(app => app.cat === selectedCategory);
  }, [apps, selectedCategory]);

  const getInitials = (id: string): string => {
    return id
      .split('-')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="apps-section">
      <div className="apps-section__header">
        <h3 className="apps-section__title">Applications</h3>
        <div className="apps-section__filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`apps-section__filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="apps-section__grid">
        {filteredApps.map(app => (
          <div key={app.id} className="app-cell">
            <div
              className="app-cell__accent-bar"
              style={{ backgroundColor: HOST_COLORS[app.host] }}
            />
            <div className="app-cell__content">
              <div className="app-cell__header">
                <div
                  className="app-cell__initials"
                  style={{
                    backgroundColor: HOST_COLORS[app.host] + '20',
                    borderColor: HOST_COLORS[app.host] + '50',
                    color: HOST_COLORS[app.host],
                  }}
                >
                  {getInitials(app.id)}
                </div>
                <div className="app-cell__info">
                  <div className="app-cell__name">{app.id}</div>
                  <div className="app-cell__version">{app.version}</div>
                </div>
              </div>
              <div className="app-cell__status">
                <div
                  className="app-cell__status-dot"
                  style={{ backgroundColor: STATUS_COLORS[app.state] || STATUS_COLORS.running }}
                />
                <span className="app-cell__status-text">{app.state.toUpperCase()}</span>
              </div>
              <div className="app-cell__meta">{app.meta}</div>
            </div>
          </div>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="apps-section__empty">No applications found</div>
      )}
    </div>
  );
};
