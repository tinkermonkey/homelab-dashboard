import React from 'react'
import './Panel.css'

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  footer?: React.ReactNode
  bordered?: boolean
  children: React.ReactNode
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ title, subtitle, footer, bordered = true, className = '', children, ...props }, ref) => {
    const classNames = ['panel', !bordered && 'panel--no-border', className]
      .filter(Boolean)
      .join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        {(title || subtitle) && (
          <div className="panel__header">
            <div>
              {title && <div className="panel__title">{title}</div>}
              {subtitle && <div className="panel__subtitle">{subtitle}</div>}
            </div>
          </div>
        )}
        <div className="panel__body">{children}</div>
        {footer && <div className="panel__footer">{footer}</div>}
      </div>
    )
  }
)

Panel.displayName = 'Panel'

export default Panel
