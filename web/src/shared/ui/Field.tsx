import { useId, type InputHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Field({ label, hint, id, className, ...input }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <input id={inputId} className={styles.input} aria-describedby={hintId} {...input} />
      {hint && <span id={hintId} className={styles.hint}>{hint}</span>}
    </div>
  )
}
