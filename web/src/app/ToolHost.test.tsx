import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ToolModule, ToolProps } from './tools'

const dispose = vi.fn()
function Tool({ registerLifecycle }: ToolProps) {
  registerLifecycle({ dispose })
  return <h1>Tool</h1>
}
// verktøyet er ferdig lastet, så det monteres i samme omgang som rammen (der feilen oppsto)
vi.mock('./tool-loader', () => ({ TOOL_COMPONENTS: { mockups: Tool }, retryToolLoads: () => undefined }))
const { ToolHost } = await import('./ToolHost')

describe('ToolHost: opprydning', () => {
  it('verktøyets ressurser frigjøres ved ekte lukking, ikke når React i utvikling monterer på nytt', async () => {
    const tool = { id: 'mockups', group: 'tools', accepts: [] } as unknown as ToolModule
    const onLifecycle = vi.fn()
    const { unmount } = render(<StrictMode><ToolHost tool={tool} query={{}} onLifecycle={onLifecycle} /></StrictMode>)
    expect(screen.getByRole('heading', { name: 'Tool' })).toBeTruthy()
    await act(async () => { await Promise.resolve() })
    expect(dispose).not.toHaveBeenCalled()
    unmount()
    await act(async () => { await Promise.resolve() })
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(onLifecycle).toHaveBeenLastCalledWith(null)
  })
})
