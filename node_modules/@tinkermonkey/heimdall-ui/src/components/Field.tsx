import React from 'react'
import './Field.css'

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  required?: boolean
  error?: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ label, required = false, error, hint, children, className = '', ...props }, ref) => {
    const classNames = ['field', className].filter(Boolean).join(' ')

    return (
      <div ref={ref} className={classNames} {...props}>
        {label && (
          <div className="field__label">
            <span>{label}</span>
            {required && <span className="field__required">*</span>}
            {hint && <span className="field__hint">{hint}</span>}
          </div>
        )}
        <div className="field__input">{children}</div>
        {error && <div className="field__error">{error}</div>}
      </div>
    )
  }
)

Field.displayName = 'Field'

export default Field
