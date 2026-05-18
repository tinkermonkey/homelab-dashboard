import React from 'react'
import './StatTile.css'

export type StatColor = 'cyan' | 'violet' | 'amber' | 'emerald'

export interface StatTileProps {
  label: string
  value: string | number
  delta?: {
    value: number
    label?: string
    direction?: 'up' | 'down'
  }
  color?: StatColor
  className?: string
}

export const StatTile = React.forwardRef<HTMLDivElement, StatTileProps>(
  ({ label, value, delta, color = 'cyan', className = '', ...props }, ref) => {
    const colorClass = `stat-tile--${color}`
    const classNames = ['stat-tile', colorClass, className]
      .filter(Boolean)
      .join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className="stat-tile__label">{label}</div>
        <div className="stat-tile__value">{value}</div>
        {delta && (
          <div className="stat-tile__meta">
            <span className={`stat-tile__delta stat-tile__delta--${delta.direction || 'up'}`}>
              {delta.direction === 'down' ? '−' : '+'}
              {Math.abs(delta.value)}
            </span>
            {delta.label && <span className="stat-tile__label-secondary">{delta.label}</span>}
          </div>
        )}
      </div>
    )
  }
)

StatTile.displayName = 'StatTile'

export default StatTile
