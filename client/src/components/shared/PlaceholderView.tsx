import React from 'react';

interface PlaceholderViewProps {
  routeName: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ routeName }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--canvas-fg-1)',
          marginBottom: '12px',
        }}
      >
        {routeName}
      </div>
      <div
        style={{
          fontSize: '14px',
          color: 'var(--canvas-fg-2)',
          marginBottom: '24px',
        }}
      >
        Coming in Phase 2+
      </div>
      <div
        style={{
          maxWidth: '400px',
          fontSize: '13px',
          color: 'var(--canvas-fg-2)',
          lineHeight: '1.6',
        }}
      >
        This view is a placeholder. Full implementation coming in future phases.
      </div>
    </div>
  );
};
