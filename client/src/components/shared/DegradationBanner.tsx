import React from 'react';
import { AlertStrip } from '@tinkermonkey/heimdall-ui';

interface DegradationBannerProps {
  degraded?: string[] | null;
  dataSource?: string;
}

export const DegradationBanner: React.FC<DegradationBannerProps> = ({ degraded, dataSource }) => {
  if (!degraded || degraded.length === 0) return null;
  const tail = dataSource === 'mock' ? 'fabricated sample data' : 'cached data';
  return (
    <AlertStrip
      alerts={[{ id: 'degradation', severity: 'warn', message: `Partial Data: ${degraded.join(', ')} are temporarily unavailable. Showing ${tail}.` }]}
      style={{ marginBottom: '24px' }}
    />
  );
};
