import React from 'react'
import './AppTitle.css'

export interface AppTitleProps {
  title: string
  version?: string
  collapsed?: boolean
  className?: string
}

export const AppTitle = React.forwardRef<HTMLDivElement, AppTitleProps>(
  ({ title, version, collapsed = false, className = '', ...props }, ref) => {
    const classNames = [
      'app-title',
      collapsed && 'app-title--collapsed',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className="app-title__mark" />
        {!collapsed && (
          <div className="app-title__text">
            <div className="app-title__name">{title}</div>
            {version && <span className="app-title__version">{version}</span>}
          </div>
        )}
      </div>
    )
  }
)

AppTitle.displayName = 'AppTitle'

export default AppTitle
