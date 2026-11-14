import { Checkbox, FileInput, PasswordInput, Select, Textarea, TextInput } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import classes from './forms.module.css'

/** Shared by every field: a visible label, optional help text and error. */
export interface FieldBaseProps {
  label: string
  description?: ReactNode
  /** Error text; also marks the input invalid for assistive tech. */
  error?: ReactNode
  required?: boolean
  disabled?: boolean
  name?: string
}

const INPUT_CLASSES = {
  label: classes.label,
  description: classes.description,
  error: classes.error,
  input: classes.input,
}

export interface TextFieldProps extends FieldBaseProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'search' | 'url' | 'tel' | 'date'
  autoComplete?: string
  /** One-line rows (field + button): the label becomes the accessible name and the placeholder. */
  hideLabel?: boolean
}

export function TextField({ onChange, hideLabel, label, placeholder, ...props }: TextFieldProps) {
  return (
    <TextInput
      {...props}
      label={hideLabel ? undefined : label}
      aria-label={hideLabel ? label : undefined}
      placeholder={hideLabel ? (placeholder ?? label) : placeholder}
      size="md"
      classNames={INPUT_CLASSES}
      onChange={(e) => onChange?.(e.currentTarget.value)}
    />
  )
}

export interface PasswordFieldProps extends FieldBaseProps {
  value?: string
  onChange?: (value: string) => void
  autoComplete?: 'current-password' | 'new-password'
}

export function PasswordField({ onChange, ...props }: PasswordFieldProps) {
  return <PasswordInput {...props} size="md" classNames={INPUT_CLASSES} onChange={(e) => onChange?.(e.currentTarget.value)} />
}

export interface TextAreaFieldProps extends FieldBaseProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  /** Visible rows; the user can drag it taller. */
  rows?: number
}

export function TextAreaField({ onChange, rows = 4, ...props }: TextAreaFieldProps) {
  return (
    <Textarea
      {...props}
      size="md"
      rows={rows}
      resize="vertical"
      classNames={INPUT_CLASSES}
      onChange={(e) => onChange?.(e.currentTarget.value)}
    />
  )
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps extends FieldBaseProps {
  options: SelectOption[]
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  /** Shows a clear button. */
  clearable?: boolean
  /** Lets the user type to filter options. */
  searchable?: boolean
}

export function SelectField({ onChange, options, ...props }: SelectFieldProps) {
  return (
    <Select
      {...props}
      data={options}
      size="md"
      classNames={INPUT_CLASSES}
      allowDeselect={false}
      onChange={(value) => onChange?.(value)}
    />
  )
}

export interface FileFieldProps extends FieldBaseProps {
  value?: File | null
  onChange?: (file: File | null) => void
  placeholder?: string
  /** MIME filter; defaults to audio files. */
  accept?: string
}

/** Single-file picker, audio by default (for uploading recorded phrases). */
export function FileField({ onChange, accept = 'audio/*', ...props }: FileFieldProps) {
  return (
    <FileInput
      {...props}
      accept={accept}
      size="md"
      clearable
      leftSection={<IconUpload size={18} aria-hidden="true" />}
      classNames={INPUT_CLASSES}
      onChange={(file) => onChange?.(file)}
    />
  )
}

const CHECKBOX_CLASSES = {
  label: classes.label,
  description: classes.description,
  error: classes.error,
  body: classes.checkboxBody,
}

export interface CheckboxFieldProps extends FieldBaseProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export function CheckboxField({ onChange, ...props }: CheckboxFieldProps) {
  return (
    <Checkbox
      {...props}
      size="md"
      classNames={CHECKBOX_CLASSES}
      onChange={(e) => onChange?.(e.currentTarget.checked)}
    />
  )
}
