import React, { useMemo, useId } from 'react';
import './GatewayChart.css';

interface GatewayChartProps {
  downHist: number[];
  upHist: number[];
  pingHist: number[];
  currentDown: number;
  currentUp: number;
  currentPing: number;
}

const Chart: React.FC<{
  data: number[];
  width: number;
  height: number;
  primaryColor: string;
  secondaryColor?: string;
  secondaryData?: number[];
  showGrid?: boolean;
  label: string;
  unit: string;
  currentValue?: number;
  currentSecondaryValue?: number;
}> = ({
  data,
  width,
  height,
  primaryColor,
  secondaryColor,
  secondaryData,
  showGrid = false,
  label,
  unit,
  currentValue,
  currentSecondaryValue,
}) => {
  const padding = { top: 16, right: 8, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = useMemo(() => {
    const allValues = [...data, ...(secondaryData || [])].filter(v => v > 0);
    return Math.max(...allValues, 1);
  }, [data, secondaryData]);

  const points = useMemo(() => {
    return data.map((v, i) => ({
      x: (i / (data.length - 1)) * chartWidth,
      y: chartHeight - (v / maxValue) * chartHeight,
    }));
  }, [data, chartWidth, chartHeight, maxValue]);

  const secondaryPoints = useMemo(() => {
    if (!secondaryData) return [];
    return secondaryData.map((v, i) => ({
      x: (i / (secondaryData.length - 1)) * chartWidth,
      y: chartHeight - (v / maxValue) * chartHeight,
    }));
  }, [secondaryData, chartWidth, chartHeight, maxValue]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    const pathParts = [
      `M ${points[0].x} ${points[0].y}`,
      ...points.slice(1).map(p => `L ${p.x} ${p.y}`),
    ];
    return pathParts.join(' ');
  }, [points]);

  const areaPathD = useMemo(() => {
    if (points.length === 0) return '';
    const pathParts = [
      `M ${points[0].x} ${points[0].y}`,
      ...points.slice(1).map(p => `L ${p.x} ${p.y}`),
      `L ${points[points.length - 1].x} ${chartHeight}`,
      `L ${points[0].x} ${chartHeight}`,
      'Z',
    ];
    return pathParts.join(' ');
  }, [points, chartHeight]);

  const secondaryPathD = useMemo(() => {
    if (secondaryPoints.length === 0) return '';
    const pathParts = [
      `M ${secondaryPoints[0].x} ${secondaryPoints[0].y}`,
      ...secondaryPoints.slice(1).map(p => `L ${p.x} ${p.y}`),
    ];
    return pathParts.join(' ');
  }, [secondaryPoints]);

  const gridLines = 3;
  const yAxisLabels = Array.from({ length: gridLines + 1 }, (_, i) => {
    const value = (maxValue / gridLines) * (gridLines - i);
    return { value: Math.round(value), y: (i / gridLines) * chartHeight };
  });

  const gradientId = useId();

  return (
    <div className="gateway-chart">
      <div className="gateway-chart__header">
        <span className="gateway-chart__label">{label}</span>
        <div className="gateway-chart__values">
          {currentValue !== undefined && (
            <span className="gateway-chart__value">{currentValue} {unit}</span>
          )}
          {currentSecondaryValue !== undefined && (
            <span className="gateway-chart__value" style={{ marginLeft: '12px' }}>
              {currentSecondaryValue} {unit}
            </span>
          )}
        </div>
      </div>

      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="gateway-chart__svg">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && yAxisLabels.slice(1, -1).map((label, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={padding.top + label.y}
            x2={width - padding.right}
            y2={padding.top + label.y}
            className="gateway-chart__grid-line"
          />
        ))}

        {/* Y-axis labels */}
        {yAxisLabels.map((label, i) => (
          <text
            key={`y-label-${i}`}
            x={padding.left - 8}
            y={padding.top + label.y + 4}
            className="gateway-chart__y-label"
          >
            {label.value}
          </text>
        ))}

        {/* X-axis labels */}
        <text x={padding.left} y={height - 4} className="gateway-chart__x-label">
          -24h
        </text>
        <text x={width - padding.right - 8} y={height - 4} className="gateway-chart__x-label">
          now
        </text>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Area fill (primary) */}
          {areaPathD && (
            <path
              d={areaPathD}
              fill={`url(#${gradientId})`}
              className="gateway-chart__area"
            />
          )}

          {/* Line (secondary - dashed) */}
          {secondaryPathD && secondaryColor && (
            <path
              d={secondaryPathD}
              stroke={secondaryColor}
              strokeWidth="2"
              fill="none"
              strokeDasharray="4,2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="gateway-chart__line gateway-chart__line--secondary"
            />
          )}

          {/* Line (primary - solid) */}
          {pathD && (
            <path
              d={pathD}
              stroke={primaryColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="gateway-chart__line"
            />
          )}
        </g>
      </svg>
    </div>
  );
};

export const GatewayChart: React.FC<GatewayChartProps> = ({
  downHist,
  upHist,
  pingHist,
  currentDown,
  currentUp,
  currentPing,
}) => {
  return (
    <div className="gateway-charts">
      <div className="gateway-charts__section">
        <Chart
          data={downHist}
          secondaryData={upHist}
          width={320}
          height={120}
          primaryColor="rgb(var(--status-cyan))"
          secondaryColor="rgb(var(--status-violet))"
          showGrid={true}
          label="THROUGHPUT (24H)"
          unit="Mbps"
          currentValue={currentDown}
          currentSecondaryValue={currentUp}
        />
      </div>

      <div className="gateway-charts__divider" />

      <div className="gateway-charts__section">
        <Chart
          data={pingHist}
          width={320}
          height={120}
          primaryColor="rgb(var(--status-cyan))"
          label="LATENCY (24H)"
          unit="ms"
          currentValue={currentPing}
        />
      </div>
    </div>
  );
};
