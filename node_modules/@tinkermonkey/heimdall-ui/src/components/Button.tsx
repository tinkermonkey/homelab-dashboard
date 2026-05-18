import React from 'react'
import './Button.css'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type Size = 'sm' | 'md'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', disabled, ...props }, ref) => {
    const classNames = [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={classNames}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button
