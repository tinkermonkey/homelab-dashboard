import React from 'react'
import { AppTitle, AppTitleProps } from './AppTitle'
import { Statusbar, StatusbarProps } from './Statusbar'
import { Sidebar, SidebarProps } from './Sidebar'
import { Topbar, TopbarProps } from './Topbar'
import './ShellLayout.css'

export interface ShellLayoutProps {
  appTitle?: AppTitleProps & { hide?: boolean }
  topbar?: TopbarProps & { hide?: boolean }
  sidebar?: SidebarProps & { hide?: boolean }
  statusbar?: StatusbarProps & { hide?: boolean }
  children: React.ReactNode
  className?: string
}

export const ShellLayout = React.forwardRef<HTMLDivElement, ShellLayoutProps>(
  (
    {
      appTitle,
      topbar,
      sidebar,
      statusbar,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const classNames = ['shell-layout', className].filter(Boolean).join(' ')

    const { hide: _appTitleHide, ...appTitleProps } = appTitle ?? {} as AppTitleProps & { hide?: boolean }
    const renderAppTitle = appTitle && !appTitle.hide

    const { hide: _topbarHide, ...topbarProps } = topbar ?? {} as TopbarProps & { hide?: boolean }
    const renderTopbar = topbar && !topbar.hide

    const { hide: _sidebarHide, ...sidebarProps } = sidebar ?? {} as SidebarProps & { hide?: boolean }
    const renderSidebar = sidebar && !sidebar.hide

    const { hide: _statusbarHide, ...statusbarProps } = statusbar ?? {} as StatusbarProps & { hide?: boolean }
    const renderStatusbar = statusbar && !statusbar.hide

    const sidebarCollapsed = sidebarProps.collapsed ?? false

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className="shell-layout__main">
          {renderSidebar ? (
            <div className="shell-layout__sidebar-col">
              {renderAppTitle && (
                <AppTitle {...appTitleProps} collapsed={sidebarCollapsed} />
              )}
              <Sidebar {...sidebarProps} />
            </div>
          ) : renderAppTitle ? (
            <AppTitle {...appTitleProps} />
          ) : null}
          <div className="shell-layout__content">
            {renderTopbar && <Topbar {...topbarProps} />}
            <div className="shell-layout__canvas">{children}</div>
          </div>
        </div>
        {renderStatusbar && <Statusbar {...statusbarProps} />}
      </div>
    )
  }
)

ShellLayout.displayName = 'ShellLayout'

export default ShellLayout
