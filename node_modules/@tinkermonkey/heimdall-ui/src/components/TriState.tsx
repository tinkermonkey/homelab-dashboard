import React from 'react'
import './TriState.css'

export interface TriStateProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
}

export const TriState = React.forwardRef<HTMLInputElement, TriStateProps>(
  ({ indeterminate = false, className = '', ...props }, ref) => {
    const internalRef: React.MutableRefObject<HTMLInputElement | null> =
      React.useRef<HTMLInputElement>(null)

    const mergedRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate
      }
    }, [indeterminate])

    const classNames = [
      'tri-state',
      indeterminate && 'tri-state--indeterminate',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <input
        ref={mergedRef}
        type="checkbox"
        className={classNames}
        {...props}
      />
    )
  }
)

TriState.displayName = 'TriState'

export default TriState
