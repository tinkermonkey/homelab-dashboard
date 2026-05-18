import React from 'react';
import { getIconSvgPath } from '../../utils/icons';
import './AlertsStrip.css';

interface AlertsStripProps {
  activeAlerts: number;
  lastAlert?: string;
}

interface IconProps {
  name: string;
  size?: number;
}

const Icon: React.FC<IconProps> = ({ name, size = 24 }) => {
  const pathData = getIconSvgPath(name);
  if (!pathData) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g dangerouslySetInnerHTML={{ __html: pathData }} />
    </svg>
  );
};

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
