import React from 'react'
import './Topbar.css'

export interface TopbarProps {
  breadcrumbs?: Array<{
    label: string
    href?: string
    onClick?: () => void
  }>
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  children?: React.ReactNode
  className?: string
}

export const Topbar = React.forwardRef<HTMLDivElement, TopbarProps>(
  (
    {
      breadcrumbs,
      searchPlaceholder = 'Search...',
      onSearch,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const classNames = ['topbar', className].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className="topbar__breadcrumbs">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="breadcrumbs">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="breadcrumbs__separator">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="breadcrumbs__link">
                      {crumb.label}
                    </a>
                  ) : (
                    <button
                      className="breadcrumbs__link"
                      onClick={crumb.onClick}
                      style={{ background: 'none', border: 'none', cursor: crumb.onClick ? 'pointer' : 'default' }}
                    >
                      {crumb.label}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        <div className="topbar__actions">
          {onSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="topbar__search"
              onChange={e => onSearch(e.target.value)}
            />
          )}
          {children}
        </div>
      </div>
    )
  }
)

Topbar.displayName = 'Topbar'

export default Topbar
