import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Variant = 'default' | 'primary' | 'ghost'

interface Common {
  variant?: Variant | undefined
  size?: 'default' | 'small' | undefined
  block?: boolean | undefined
  iconOnly?: boolean | undefined
  children: ReactNode
}

function classes({ variant = 'default', size = 'default', block, iconOnly }: Omit<Common, 'children'>, extra?: string) {
  return [
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'ghost' && styles.ghost,
    size === 'small' && styles.small,
    block && styles.block,
    iconOnly && styles.iconOnly,
    extra,
  ].filter(Boolean).join(' ')
}

export function Button({ variant, size, block, iconOnly, className, type = 'button', ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes({ variant, size, block, iconOnly }, className)} {...rest} />
}

/** Lenke som ser ut som en knapp (f.eks. til dagens versjon av et verktøy). */
export function ButtonLink({ variant, size, block, iconOnly, className, ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={classes({ variant, size, block, iconOnly }, className)} {...rest} />
}
