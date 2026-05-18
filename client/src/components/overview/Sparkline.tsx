import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  areaColor?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 48,
  height = 24,
  color = 'currentColor',
  areaColor = 'currentColor',
}) => {
  const gradientId = useMemo(() => `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`, []);

  if (!data || data.length === 0) return null;

  // Find min and max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Calculate points for the line
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height * 0.9) - height * 0.05;
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;

  // Create area path (line + bottom close)
  const areaPoints = [
    points[0],
    ...points.slice(1),
    `${width},${height}`,
    `0,${height}`,
  ].join(' L');
  const areaPathD = `M${areaPoints}Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: areaColor, stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: areaColor, stopOpacity: 0.01 }} />
        </linearGradient>
      </defs>
      <path
        d={areaPathD}
        fill={`url(#${gradientId})`}
        stroke="none"
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
