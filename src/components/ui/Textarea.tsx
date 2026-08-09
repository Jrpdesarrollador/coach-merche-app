import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { Field } from './Field'
import { controlClasses, describedBy } from './fieldStyles'

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  label: string
  hint?: string
  error?: string
}

export function Textarea({
  id,
  label,
  hint,
  error,
  rows = 4,
  className,
  ...props
}: TextareaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={props.required}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, 'resize-y', className)}
        {...props}
      />
    </Field>
  )
}
