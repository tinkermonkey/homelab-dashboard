import React from 'react';
import { Icon } from '../shared/Icon';

interface TitlebarProps {
  title?: string;
  onCommandPaletteClick?: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({ title = 'Homelab', onCommandPaletteClick }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        paddingLeft: '8px',
        paddingRight: '16px',
        background: 'rgb(var(--shell-bg))',
        borderBottom: '1px solid rgb(var(--shell-border))',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', gap: '8px', marginRight: 'auto' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#FF5F57',
          }}
        />
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#FEBC2E',
          }}
        />
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#28C940',
          }}
        />
      </div>

      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'rgb(var(--shell-fg-2))',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={onCommandPaletteClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            fontSize: '11px',
            color: 'rgb(var(--shell-fg-2))',
            cursor: 'pointer',
            transition: 'all 80ms ease-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          title="Command Palette (⌘K)"
        >
          <Icon name="search" size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>⌘K</span>
        </button>

        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgb(var(--status-ok))',
          }}
        />
        <span style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>Cluster</span>
      </div>
    </div>
  );
};
