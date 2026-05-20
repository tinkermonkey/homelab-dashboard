import React from 'react';
import { FilterBar, Chip } from '@tinkermonkey/heimdall-ui';
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
          <div
            key={chip.id}
            className={`host-filter-chip-wrapper ${selectedHost === chip.id ? 'host-filter-chip-wrapper--active' : ''}`}
            onClick={() => onHostSelect(chip.id)}
            data-testid={`host-filter-${chip.id}`}
          >
            <Chip className="host-filter-chip">
              <span className="host-filter-chip-label">
                {chip.id === 'all' ? 'all hosts' : chip.id}
              </span>
              <span className="host-filter-chip-count">{chip.count}</span>
              {selectedHost === chip.id && (
                <button
                  className="host-filter-chip-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHostSelect('all');
                  }}
                  aria-label={`Deselect ${chip.id}`}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </Chip>
          </div>
        ))}
      </div>
    </div>
  );
};
