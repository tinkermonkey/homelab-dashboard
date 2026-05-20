import React from 'react';
import { FilterBar } from '@tinkermonkey/heimdall-ui';
import type { FilterChip } from '@tinkermonkey/heimdall-ui';
import './HostFilterBar.css';

interface HostFilterChip extends FilterChip {
  count: number;
}

interface HostFilterBarProps {
  hostFilters: HostFilterChip[];
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
      {onSearchChange && (
        <FilterBar
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
        />
      )}
      <div className="host-filter-bar__chips">
        {hostFilters.map(chip => (
          <button
            key={chip.id}
            onClick={() => onHostSelect(chip.id)}
            className={`host-filter-chip ${selectedHost === chip.id ? 'host-filter-chip--active' : ''}`}
            data-testid={`host-filter-${chip.id}`}
          >
            <span>
              {chip.id === 'all' ? 'all hosts' : chip.id}
            </span>
            <span className="host-filter-chip__count">
              {chip.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
