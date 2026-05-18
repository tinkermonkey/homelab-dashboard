import React from 'react'
import './Select.css'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  children: React.ReactNode
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, className = '', ...props }, ref) => {
    const classNames = [
      'select',
      error && 'select--error',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <select
        ref={ref}
        className={classNames}
        {...props}
      />
    )
  }
)

Select.displayName = 'Select'

export default Select
