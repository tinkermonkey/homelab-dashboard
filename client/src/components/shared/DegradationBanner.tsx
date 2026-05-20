import React from 'react';
import { AlertStrip, type Alert as HeimdallAlert } from '@tinkermonkey/heimdall-ui';

interface DegradationBannerProps {
  degraded?: string[];
  dataSource?: 'real' | 'mock';
}

export const DegradationBanner: React.FC<DegradationBannerProps> = ({ degraded, dataSource }) => {
  if (!degraded || degraded.length === 0) {
    return null;
  }

  const dataStatus = dataSource === 'mock' ? 'fabricated sample data' : 'cached data';
  const alerts: HeimdallAlert[] = [
    {
      id: 'degradation',
      severity: 'warn',
      message: `Partial Data: ${degraded.join(', ')} are temporarily unavailable. Showing ${dataStatus}.`,
    },
  ];

  return (
    <AlertStrip
      alerts={alerts}
      style={{ marginBottom: '24px' }}
    />
  );
};
