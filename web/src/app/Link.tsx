import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { hrefFor, type Route } from './router'
import { useServices } from './services'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: Route
  /** Del av siden (f.eks. `some` = SoMe-mappen på forsiden). */
  hash?: string
}

/** Intern lenke: vanlig <a href> (kan åpnes i ny fane), men navigerer uten sideinnlasting ved vanlig klikk. */
export function Link({ to, hash, onClick, ...rest }: LinkProps) {
  const { router } = useServices()
  const href = hrefFor(to) + (hash ? `#${hash}` : '')
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    router.navigate(to, hash ? { hash } : {})
  }
  return <a href={href} onClick={handleClick} {...rest} />
}
