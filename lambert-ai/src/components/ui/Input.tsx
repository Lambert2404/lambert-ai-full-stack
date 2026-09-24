import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface FieldChrome {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldChrome {}
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldChrome {}

const fieldBase =
  'w-full rounded-md border bg-paper-0 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500/40 disabled:bg-paper-100 disabled:text-ink-300'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, required, id, className, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-ink-700">
            {label}
            {required && <span className="text-crimson-600"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(fieldBase, error ? 'border-crimson-600' : 'border-ink-300/60', className)}
          {...props}
        />
        {error ? (
          <p id={`${fieldId}-error`} className="text-sm text-crimson-600">
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="text-sm text-ink-500">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, id, className, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-ink-700">
            {label}
            {required && <span className="text-crimson-600"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          className={cn(fieldBase, 'resize-y', error ? 'border-crimson-600' : 'border-ink-300/60', className)}
          {...props}
        />
        {error ? (
          <p className="text-sm text-crimson-600">{error}</p>
        ) : hint ? (
          <p className="text-sm text-ink-500">{hint}</p>
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
