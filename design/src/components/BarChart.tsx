import React from 'react'
import './BarChart.css'
import { chartColors } from './chartColors'
import { TONE, fmt, type ChartTone } from './chartTone'
import { statusColorMap, type BarChartSeries } from './statusColors'

export type { BarChartSeries }

export interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  series: BarChartSeries[]
  xLabels?: string[]
  yMin?: number
  yMax?: number
  yTickCount?: number
  legend?: boolean
  width?: number
  height?: number
  tone?: ChartTone
  ariaLabel?: string
}

export const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      series,
      xLabels = [],
      yMin: customYMin,
      yMax: customYMax,
      yTickCount = 5,
      legend = false,
      width = 400,
      height = 200,
      tone = 'light',
      ariaLabel,
      className = '',
      ...rest
    },
    ref
  ) => {
    const T = TONE[tone]

    const emptyState = (message: string) => (
      <div
        ref={ref}
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.fg3,
          fontSize: '12px',
        }}
        {...rest}
      >
        {message}
      </div>
    )

    if (!series || series.length === 0) return emptyState('No data')

    // Data extents (loop to avoid call-stack limits on large arrays)
    let dataMin = Infinity
    let dataMax = -Infinity
    let dataPointCount = 0
    series.forEach((s) => {
      if (s.data && s.data.length > 0) {
        if (s.data.length > dataPointCount) dataPointCount = s.data.length
        for (let i = 0; i < s.data.length; i++) {
          const v = s.data[i]
          if (v < dataMin) dataMin = v
          if (v > dataMax) dataMax = v
        }
      }
    })

    if (dataPointCount === 0) return emptyState('No data')

    const hasData = isFinite(dataMin) && isFinite(dataMax)
    // Bars read from a baseline, so default the floor to 0 unless data goes negative.
    const yMin = customYMin !== undefined ? customYMin : hasData ? Math.min(0, dataMin) : 0
    const yMax = customYMax !== undefined ? customYMax : hasData ? dataMax : 1
    const yRange = yMax - yMin || 1

    // Pixel-space layout (matches BarV / BarH convention)
    const pad = { top: 8, right: 10, bottom: 22, left: 36 }
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom

    const yAt = (v: number) => pad.top + innerH - ((v - yMin) / yRange) * innerH
    const baselineY = yAt(Math.max(yMin, 0))

    const yTicks = Array.from({ length: yTickCount }, (_, i) => {
      const divisor = yTickCount === 1 ? 1 : yTickCount - 1
      const value = yMin + (yRange * i) / divisor
      return { value, y: yAt(value) }
    })

    const groupW = innerW / dataPointCount
    const groupPad = groupW * 0.18
    const barW = Math.max(1, (groupW - groupPad * 2) / series.length)

    const colorFor = (s: BarChartSeries, i: number) =>
      s.color ? statusColorMap[s.color] : chartColors[i % chartColors.length]

    return (
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className={className} {...rest}>
        <svg
          role="img"
          aria-label={ariaLabel ?? series.map((s) => s.name).join(', ')}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          {ariaLabel && <title>{ariaLabel}</title>}

          {/* Grid lines + y-axis tick labels */}
          {yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke={T.grid} strokeWidth="1" />
              <text
                x={pad.left - 6}
                y={tick.y + 3}
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
                fontSize="10"
                fill={T.fg3}
              >
                {fmt(tick.value)}
              </text>
            </g>
          ))}

          {/* Axes */}
          <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} stroke={T.border} strokeWidth="1" />
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke={T.border} strokeWidth="1" />

          {/* Grouped bars: series side-by-side at each x position */}
          {series.map((s, si) => {
            const color = colorFor(s, si)
            return (
              <g key={`series-${si}`}>
                {s.data.map((value, di) => {
                  const x = pad.left + di * groupW + groupPad + si * barW
                  const y = yAt(value)
                  const top = Math.min(y, baselineY)
                  const h = Math.abs(baselineY - y)
                  return (
                    <rect
                      key={`bar-${si}-${di}`}
                      x={x}
                      y={top}
                      width={Math.max(1, barW - 1)}
                      height={Math.max(0, h)}
                      fill={color}
                      rx="1"
                    />
                  )
                })}
              </g>
            )
          })}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={`x-${i}`}
              x={pad.left + (i + 0.5) * groupW}
              y={pad.top + innerH + 14}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="10"
              fill={T.fg3}
            >
              {label}
            </text>
          ))}
        </svg>

        {legend && (
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', flexWrap: 'wrap', color: T.fg2 }}>
            {series.map((s, idx) => (
              <div key={`legend-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '1px', backgroundColor: colorFor(s, idx) }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

BarChart.displayName = 'BarChart'

export default BarChart
