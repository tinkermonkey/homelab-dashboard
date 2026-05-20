import React from 'react';
import { Chip } from '@tinkermonkey/heimdall-ui';
import { Icon } from '../shared/Icon';
import './TabBarWithIcons.css';

export interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: string;
  iconSize?: number;
}

export interface TabBarWithIconsProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  className?: string;
}

export const TabBarWithIcons = React.forwardRef<HTMLDivElement, TabBarWithIconsProps>(
  ({ tabs, activeTabId, onSelectTab, className = '', ...props }, ref) => {
    const classNames = ['tab-bar', className].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        <div className="tab-bar__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-bar__tab ${activeTabId === tab.id ? 'tab-bar__tab--active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              {tab.icon && (
                <span className="tab-bar__tab-icon">
                  <Icon name={tab.icon} size={tab.iconSize ?? 24} />
                </span>
              )}
              <span className="tab-bar__tab-label">{tab.label}</span>
              {tab.count !== undefined && (
                <Chip form="id-tag">{tab.count}</Chip>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

TabBarWithIcons.displayName = 'TabBarWithIcons';

export default TabBarWithIcons;
