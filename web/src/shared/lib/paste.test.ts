import { createElement, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FeedbackButton } from '../../app/Feedback'
import { ServicesContext, type Services } from '../../app/services'
import type { Me } from '../../domain/account'
import { pastedImage } from './paste'

const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'Screenshot 2026-10-31 at 12.56.36.png', { type: 'image/png' })
/** Innliming med et bilde på utklippstavlen, rettet mot `target`. */
function paste(target: EventTarget | null, opts: { prevented?: boolean; items?: { kind: string; type: string; getAsFile: () => File | null }[] } = {}): ClipboardEvent {
  const file = png()
  return {
    defaultPrevented: !!opts.prevented,
    target,
    clipboardData: { items: opts.items ?? [{ kind: 'file', type: 'image/png', getAsFile: () => file }] },
  } as unknown as ClipboardEvent
}
const hosts: HTMLElement[] = []
const el = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  hosts.push(host)
  return host
}

afterEach(() => {
  cleanup()
  for (const h of hosts.splice(0)) h.remove()
})

describe('pastedImage: innliming som nytt arbeidsbilde', () => {
  it('på siden (ingen felt i fokus): bildet tas imot', () => {
    expect(pastedImage(paste(document.body))?.name).toBe('Screenshot 2026-10-31 at 12.56.36.png')
  })

  it('i tekstfelt, tekstområde, nedtrekksliste og redigerbare felt: ignoreres', () => {
    const host = el('<input id="i"><textarea id="t"></textarea><select id="s"></select><div id="c" contenteditable="true"><span id="cc">x</span></div><div id="p" contenteditable="plaintext-only"></div>')
    for (const id of ['i', 't', 's', 'c', 'cc', 'p']) expect(pastedImage(paste(host.querySelector('#' + id))), id).toBeNull()
  })

  it('i dialoger (role=dialog, alertdialog, <dialog>) og i alt merket data-chfb: ignoreres', () => {
    const host = el('<div role="dialog"><button id="a">x</button></div><div role="alertdialog"><p id="b">x</p></div><dialog open><p id="c">x</p></dialog><div data-chfb=""><span id="d">x</span></div>')
    for (const id of ['a', 'b', 'c', 'd']) expect(pastedImage(paste(host.querySelector('#' + id))), id).toBeNull()
  })

  it('fokus i et felt, men hendelsen treffer body (Safari): ignoreres', () => {
    const host = el('<textarea id="t"></textarea>')
    ;(host.querySelector('#t') as HTMLTextAreaElement).focus()
    expect(pastedImage(paste(document.body))).toBeNull()
  })

  it('allerede håndtert av noe annet (defaultPrevented): ignoreres', () => {
    expect(pastedImage(paste(document.body, { prevented: true }))).toBeNull()
  })

  it('bare tekst på utklippstavlen: null', () => {
    expect(pastedImage(paste(document.body, { items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }] }))).toBeNull()
  })

  it('det ekte tilbakemeldingsskjemaet: innliming i feltene erstatter ikke arbeidsbildet', () => {
    const me = { id: 'u1', email: 'a@b.no', full_name: 'Test', first_name: null, last_name: null, phone: null, mfa: false, roles: [], churches: [] } as unknown as Me
    const services = { feedback: { available: () => true, submit: async () => ({ id: '1', ref: 'TB-1' }) } } as unknown as Services
    function Host() {
      const [open, setOpen] = useState(false)
      return createElement(ServicesContext, { value: services }, createElement(FeedbackButton, { me, fabClass: undefined, open, onOpen: setOpen }))
    }
    render(createElement(Host))
    fireEvent.click(screen.getByRole('button', { name: 'Send tilbakemelding' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Rapporter en feil' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.hasAttribute('data-chfb')).toBe(true)
    const fields = [...dialog.querySelectorAll('input, textarea')]
    expect(fields.length).toBeGreaterThan(0)
    for (const f of fields) expect(pastedImage(paste(f))).toBeNull()
  })
})
