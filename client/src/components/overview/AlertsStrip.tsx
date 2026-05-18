import React from 'react';
import type { Alert } from '@homelab/shared';
import { Icon } from '../shared/Icon';
import './AlertsStrip.css';

interface AlertsStripProps {
  alerts: Alert[];
}

export const AlertsStrip: React.FC<AlertsStripProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return null;
  }

  const firstAlert = alerts[0];
  const severityColor = firstAlert.severity === 'critical' ? '#F43F5E'
    : firstAlert.severity === 'warning' ? '#F59E0B'
    : '#3B82F6';

  return (
    <div className="alerts-strip">
      <div className="alerts-strip__content">
        <span className="alerts-strip__icon">
          <Icon name="alert" size={16} style={{ color: severityColor }} />
        </span>
        <div className="alerts-strip__text">
          <span className="alerts-strip__count">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</span>
          <span className="alerts-strip__detail">{firstAlert.name}</span>
        </div>
      </div>
    </div>
  );
};
