import React from 'react';
import { Icon } from '../shared/Icon';

interface TopbarProps {
  currentRoute: string;
  onDarkModeToggle: () => void;
  darkMode: boolean;
  onChatToggle: () => void;
  chatVisible: boolean;
  onDensityChange?: () => void;
  onShowAlertsToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentRoute,
  onDarkModeToggle,
  darkMode,
  onChatToggle,
  chatVisible,
  onDensityChange,
  onShowAlertsToggle,
}) => {
  return (
    <div className="topbar">
      <div className="topbar__breadcrumb">
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'rgb(var(--canvas-fg-2))',
            letterSpacing: '0.01em',
          }}
        >
          <span style={{ color: 'rgb(var(--canvas-fg-3))' }}>cluster</span>
          <span style={{ color: 'rgb(var(--canvas-fg-3))', margin: '0 4px' }}>/</span>
          <span style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 600 }}>
            {currentRoute}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: 'auto',
        }}
      >
        {onShowAlertsToggle && (
          <button
            onClick={onShowAlertsToggle}
            className="btn btn--primary btn--sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Toggle alerts"
          >
            <Icon name="bell" size={16} />
            Alerts
          </button>
        )}

        {onDensityChange && (
          <button
            onClick={onDensityChange}
            className="btn btn--primary btn--sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Toggle compact density"
          >
            <Icon name="grid" size={16} />
            Density
          </button>
        )}

        <button
          onClick={onChatToggle}
          className="btn btn--primary btn--sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: chatVisible ? 'rgb(var(--accent-cyan))' : undefined,
            color: chatVisible ? '#0b0f14' : undefined,
          }}
          title="Toggle bot console"
        >
          <Icon name="bot" size={16} />
          Bot
        </button>

        <button
          onClick={onDarkModeToggle}
          className="btn btn--primary btn--sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name={darkMode ? 'sun' : 'moon'} size={16} />
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </div>
    </div>
  );
};
