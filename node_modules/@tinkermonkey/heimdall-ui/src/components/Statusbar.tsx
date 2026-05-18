import React from 'react'
import './Statusbar.css'

export interface StatusbarProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export const Statusbar = React.forwardRef<HTMLDivElement, StatusbarProps>(
  ({ left, center, right, className = '', ...props }, ref) => {
    const classNames = ['statusbar', className].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        {left && <div className="statusbar__slot statusbar__slot--left">{left}</div>}
        {center && <div className="statusbar__slot statusbar__slot--center">{center}</div>}
        {right && <div className="statusbar__slot statusbar__slot--right">{right}</div>}
      </div>
    )
  }
)

Statusbar.displayName = 'Statusbar'

export default Statusbar
