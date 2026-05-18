import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import './CommandPalette.css';

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  category?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        navigate(filtered[selectedIndex].path);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette__header">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search routes..."
            className="command-palette__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="command-palette__hint">Esc</div>
        </div>

        <div className="command-palette__results">
          {filtered.length === 0 ? (
            <div className="command-palette__empty">No results found</div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                className={`command-palette__item ${idx === selectedIndex ? 'command-palette__item--selected' : ''}`}
                onClick={() => {
                  navigate(cmd.path);
                  onClose();
                }}
              >
                <div className="command-palette__item-icon">
                  <Icon name={cmd.icon} size={16} />
                </div>
                <div className="command-palette__item-content">
                  <div className="command-palette__item-label">{cmd.label}</div>
                  {cmd.category && <div className="command-palette__item-category">{cmd.category}</div>}
                </div>
                <div className="command-palette__item-kbd">⏎</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
