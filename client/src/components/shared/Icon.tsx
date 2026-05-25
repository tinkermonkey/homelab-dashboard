import React from 'react';
import { getIconSvgPath, type IconName } from '../../utils/icons';

interface IconProps {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, style, className }) => {
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
      style={style}
      className={className}
    >
      <g dangerouslySetInnerHTML={{ __html: pathData }} />
    </svg>
  );
};
