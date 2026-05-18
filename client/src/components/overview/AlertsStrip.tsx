import React from 'react';
import { Icon } from '../shared/Icon';
import './AlertsStrip.css';

interface AlertsStripProps {
  activeAlerts: number;
  lastAlert?: string;
}

export const AlertsStrip: React.FC<AlertsStripProps> = ({ activeAlerts, lastAlert }) => {
  return (
    <div className="alerts-strip">
      <div className="alerts-strip__content">
        <span className="alerts-strip__icon">
          <Icon name="alert" size={16} />
        </span>
        <div className="alerts-strip__text">
          <span className="alerts-strip__count">{activeAlerts} active alert{activeAlerts !== 1 ? 's' : ''}</span>
          {lastAlert && <span className="alerts-strip__detail">{lastAlert}</span>}
        </div>
      </div>
    </div>
  );
};
