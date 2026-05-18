import React from 'react'
import './TabBar.css'

export interface Tab {
  id: string
  label: string
  count?: number
}

export interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onSelectTab: (tabId: string) => void
  className?: string
}

export const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
  ({ tabs, activeTabId, onSelectTab, className = '', ...props }, ref) => {
    const classNames = ['tab-bar', className].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className="tab-bar__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-bar__tab ${activeTabId === tab.id ? 'tab-bar__tab--active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className="tab-bar__tab-label">{tab.label}</span>
              {tab.count !== undefined && <span className="tab-bar__tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }
)

TabBar.displayName = 'TabBar'

export default TabBar
