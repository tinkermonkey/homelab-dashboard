import React from 'react';
import { Icon } from './Icon';

interface ErrorViewProps {
  title: string;
  message?: string;
  isDegraded?: boolean;
  degradedSources?: string[];
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title,
  message = 'An error occurred while loading this view.',
  isDegraded = false,
  degradedSources = [],
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        textAlign: 'center',
        backgroundColor: 'var(--canvas-bg)',
        color: 'var(--canvas-fg-1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <Icon
          name={isDegraded ? 'alert-triangle' : 'x-circle'}
          size={48}
          style={{
            color: isDegraded ? '#F59E0B' : '#F43F5E',
          }}
        />
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        {title}
      </h2>

      <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px', maxWidth: '400px' }}>
        {message}
      </p>

      {isDegraded && degradedSources.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '4px',
            padding: '12px 16px',
            fontSize: '12px',
            marginBottom: '16px',
            maxWidth: '400px',
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            Showing partial data from:
          </div>
          <div style={{ opacity: 0.8 }}>
            {degradedSources.join(', ')} are temporarily unavailable
          </div>
        </div>
      )}

      <p style={{ fontSize: '12px', opacity: 0.5 }}>
        Try refreshing the page or contact support if the problem persists.
      </p>
    </div>
  );
};
