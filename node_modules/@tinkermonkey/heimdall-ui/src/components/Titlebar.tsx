import React from 'react'
import './Titlebar.css'

export interface TitlebarProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export const Titlebar = React.forwardRef<HTMLDivElement, TitlebarProps>(
  ({ left, center, right, className = '', ...props }, ref) => {
    const classNames = ['titlebar', className].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        {left && <div className="titlebar__slot titlebar__slot--left">{left}</div>}
        {center && <div className="titlebar__slot titlebar__slot--center">{center}</div>}
        {right && <div className="titlebar__slot titlebar__slot--right">{right}</div>}
      </div>
    )
  }
)

Titlebar.displayName = 'Titlebar'

export default Titlebar
