import React, { useEffect, useRef, useState, useImperativeHandle } from 'react'
import './CommandPalette.css'
import { Icon, type IconName } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useBodyOverflow } from '../hooks/useBodyOverflow'

export interface Command {
  id: string
  label: string
  description?: string
  icon?: IconName
  onSelect: () => void
}

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
  placeholder?: string
}

export const CommandPalette = React.forwardRef<HTMLDivElement, CommandPaletteProps>(
  ({ isOpen, onClose, commands, placeholder = 'Search commands...' }, ref) => {
    const [search, setSearch] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const paletteRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => paletteRef.current as HTMLDivElement)

    useFocusTrap(paletteRef, isOpen)
    useBodyOverflow(isOpen)

    const filtered = commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      (cmd.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    )

    useEffect(() => {
      if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 0)
      } else {
        setSearch('')
        setSelectedIndex(0)
      }
    }, [isOpen])

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return

        if (e.key === 'Escape') {
          onClose()
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (filtered.length > 0) {
            setSelectedIndex((i) => (i + 1) % filtered.length)
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (filtered.length > 0) {
            setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
          }
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (filtered[selectedIndex]) {
            filtered[selectedIndex].onSelect()
            onClose()
            setSearch('')
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, filtered, selectedIndex])

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }

    if (!isOpen) return null

    return (
      <div
        ref={paletteRef}
        className="command-palette-backdrop"
        onClick={handleBackdropClick}
      >
        <div className="command-palette">
          <div className="command-palette__header">
            <Icon name="search" size={16} />
            <input
              ref={inputRef}
              type="text"
              className="command-palette__input"
              placeholder={placeholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(0)
              }}
            />
          </div>

          <div className="command-palette__list">
            {filtered.length === 0 ? (
              <div className="command-palette__empty">No commands found</div>
            ) : (
              filtered.map((cmd, index) => (
                <button
                  key={cmd.id}
                  className={['command-palette__item', index === selectedIndex && 'command-palette__item--selected']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    cmd.onSelect()
                    onClose()
                    setSearch('')
                  }}
                >
                  {cmd.icon && <Icon name={cmd.icon} size={16} />}
                  <div className="command-palette__item-content">
                    <div className="command-palette__item-label">{cmd.label}</div>
                    {cmd.description && (
                      <div className="command-palette__item-description">{cmd.description}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }
)

CommandPalette.displayName = 'CommandPalette'

export default CommandPalette
