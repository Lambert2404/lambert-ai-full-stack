import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ink-900 text-white hover:bg-ink-950 disabled:bg-ink-300',
  secondary: 'bg-gold-500 text-ink-950 hover:bg-gold-600 disabled:bg-gold-100 disabled:text-ink-300',
  outline: 'border border-ink-300 text-ink-900 hover:bg-paper-100 disabled:text-ink-300',
  ghost: 'text-ink-700 hover:bg-paper-100 disabled:text-ink-300',
  danger: 'bg-crimson-600 text-white hover:bg-crimson-600/90 disabled:bg-crimson-100 disabled:text-ink-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-5 py-3 gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150',
          'disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          icon
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
