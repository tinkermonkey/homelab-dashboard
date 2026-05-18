import React from 'react';

interface TitlebarProps {
  title?: string;
}

export const Titlebar: React.FC<TitlebarProps> = ({ title = 'Homelab' }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        paddingLeft: '8px',
        paddingRight: '16px',
        background: 'var(--shell-bg)',
        borderBottom: '1px solid var(--shell-border)',
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
          color: 'var(--shell-fg-2)',
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
          gap: '8px',
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          fontSize: '11px',
          color: 'var(--shell-fg-2)',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--status-ok)',
          }}
        />
        Cluster
      </div>
    </div>
  );
};
