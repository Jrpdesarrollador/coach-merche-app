import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { Field } from './Field'
import { controlClasses, describedBy } from './fieldStyles'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  hint?: string
  error?: string
}

export function Input({ id, label, hint, error, className, ...props }: InputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={props.required}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, className)}
        {...props}
      />
    </Field>
  )
}
