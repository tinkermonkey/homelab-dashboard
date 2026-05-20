import React from 'react';
import { FilterBar } from '@tinkermonkey/heimdall-ui';
import type { FilterChip } from '@tinkermonkey/heimdall-ui';
import './HostFilterBar.css';

interface HostFilterBarProps {
  hostFilters: FilterChip[];
  selectedHost: string;
  onHostSelect: (hostId: string) => void;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
}

export const HostFilterBar: React.FC<HostFilterBarProps> = ({
  hostFilters,
  selectedHost,
  onHostSelect,
  searchPlaceholder = 'Filter by name, image, tag…',
  onSearchChange
}) => {
  return (
    <div className="host-filter-bar">
      <FilterBar
        searchPlaceholder={searchPlaceholder}
        onSearchChange={onSearchChange}
        className="host-filter-bar__search"
      />
      <div className="host-filter-bar__chips">
        {hostFilters.map(chip => (
          <button
            key={chip.id}
            onClick={() => onHostSelect(chip.id)}
            className={`host-filter-chip ${selectedHost === chip.id ? 'host-filter-chip--active' : ''}`}
            data-testid={`host-filter-${chip.id}`}
          >
            <span className="host-filter-chip__label">
              {chip.id === 'all' ? 'all hosts' : chip.id}
            </span>
            <span className="host-filter-chip__count">
              {chip.label.match(/\((\d+)\)/)?.[1] || '0'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
