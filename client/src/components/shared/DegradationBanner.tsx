import React from 'react';
import { AlertStrip, type Alert as HeimdallAlert } from '@tinkermonkey/heimdall-ui';

interface DegradationBannerProps {
  degraded?: string[];
}

export const DegradationBanner: React.FC<DegradationBannerProps> = ({ degraded }) => {
  if (!degraded || degraded.length === 0) {
    return null;
  }

  const alerts: HeimdallAlert[] = [
    {
      id: 'degradation',
      severity: 'warn',
      message: `Partial Data: ${degraded.join(', ')} are temporarily unavailable. Showing cached data.`,
    },
  ];

  return (
    <AlertStrip
      alerts={alerts}
      style={{ marginBottom: '24px' }}
    />
  );
};
