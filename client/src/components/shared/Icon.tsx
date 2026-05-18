import React from 'react';
import { getIconSvgPath } from '../../utils/icons';

interface IconProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, style }) => {
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
    >
      <g dangerouslySetInnerHTML={{ __html: pathData }} />
    </svg>
  );
};
