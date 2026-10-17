import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { hrefFor, type Route } from './router'
import { useServices } from './services'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: Route
}

/** Intern lenke: vanlig <a href> (kan åpnes i ny fane), men navigerer uten sideinnlasting ved vanlig klikk. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  const { router } = useServices()
  const href = hrefFor(to)
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    router.navigate(to)
  }
  return <a href={href} onClick={handleClick} {...rest} />
}
