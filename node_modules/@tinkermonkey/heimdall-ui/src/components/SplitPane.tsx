import React, { useState, useRef } from 'react'
import './SplitPane.css'

export interface SplitPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical'
  initialSplitPercent?: number
  minSize?: number
  maxSize?: number
  first: React.ReactNode
  second: React.ReactNode
}

export const SplitPane = React.forwardRef<HTMLDivElement, SplitPaneProps>(
  ({
    direction = 'horizontal',
    initialSplitPercent = 50,
    minSize = 200,
    maxSize = 800,
    first,
    second,
    className = '',
    ...props
  }, ref) => {
    const [splitPercent, setSplitPercent] = useState(initialSplitPercent)
    const containerRef = useRef<HTMLDivElement>(null)

    const mergeRefs = (refs: Array<React.Ref<HTMLDivElement>>) => {
      return (element: HTMLDivElement | null) => {
        refs.forEach(r => {
          if (typeof r === 'function') {
            r(element)
          } else if (r) {
            (r as React.MutableRefObject<HTMLDivElement | null>).current = element
          }
        })
      }
    }

    const handleMouseDown = () => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const isHorizontal = direction === 'horizontal'

        const position = isHorizontal
          ? e.clientX - rect.left
          : e.clientY - rect.top

        const size = isHorizontal ? rect.width : rect.height

        let newPercent = (position / size) * 100
        const minPercent = minSize / size * 100
        const maxPercent = maxSize / size * 100
        newPercent = Math.max(minPercent, Math.min(newPercent, maxPercent))

        setSplitPercent(newPercent)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    const classNames = ['split-pane', `split-pane--${direction}`, className]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={mergeRefs([containerRef, ref])}
        className={classNames}
        {...props}
      >
        <div
          className="split-pane__first"
          style={direction === 'horizontal' ? { width: `${splitPercent}%` } : { height: `${splitPercent}%` }}
        >
          {first}
        </div>

        <div
          className={`split-pane__divider split-pane__divider--${direction}`}
          onMouseDown={handleMouseDown}
        />

        <div
          className="split-pane__second"
          style={direction === 'horizontal' ? { width: `${100 - splitPercent}%` } : { height: `${100 - splitPercent}%` }}
        >
          {second}
        </div>
      </div>
    )
  }
)

SplitPane.displayName = 'SplitPane'

export default SplitPane
