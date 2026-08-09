import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { Field } from './Field'
import { controlClasses, describedBy } from './fieldStyles'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
  options: SelectOption[]
  placeholder?: string
  hint?: string
  error?: string
}

export function Select({
  id,
  label,
  options,
  placeholder,
  hint,
  error,
  className,
  ...props
}: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={props.required}>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, 'appearance-none pr-10', className)}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
