import React, { useState, useMemo } from 'react';
import type { App } from '@homelab/shared';

interface AppsSectionProps {
  apps: App[];
}

const CATEGORIES = [
  { id: 'all',     label: 'all' },
  { id: 'media',   label: 'media' },
  { id: 'iot',     label: 'iot' },
  { id: 'ai',      label: 'ai' },
  { id: 'storage', label: 'storage' },
  { id: 'dev',     label: 'dev' },
  { id: 'obs',     label: 'observability' },
  { id: 'net',     label: 'network' },
];

const getInitials = (id: string): string =>
  id.split('-').map(w => w[0]).join('').substring(0, 2).toUpperCase();

export const AppsSection: React.FC<AppsSectionProps> = ({ apps }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredApps = useMemo(() => {
    if (selectedCategory === 'all') return apps;
    return apps.filter(app => app.cat === selectedCategory);
  }, [apps, selectedCategory]);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Applications</span>
        <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {filteredApps.length} shown
        </span>
      </div>

      <div className="cat-chips">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`cat-chip${selectedCategory === cat.id ? ' active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filteredApps.length === 0 ? (
        <div className="panel-body" style={{ textAlign: 'center', color: 'var(--canvas-fg-3)', fontSize: 12 }}>
          No applications found
        </div>
      ) : (
        <div className="apps-grid">
          {filteredApps.map(app => (
            <div key={app.id} className="app-cell" data-host={app.host}>
              <div className="app-mark">{getInitials(app.id)}</div>
              <div className="app-body">
                <div className="n">{app.id}</div>
                <div className="m">{app.meta}</div>
              </div>
              <span className="state-pill" data-s={app.state}>
                <span className="dot" />
                {app.state}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface AppsSectionProps {
  apps: App[];
}
