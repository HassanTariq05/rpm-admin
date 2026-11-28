import { afterEach, expect, it, vi } from 'vitest'
import { printReportPdf } from './download-report-pdf'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('opens the print preview before generation and prints the loaded PDF', async () => {
  const popup = document.createElement('iframe')
  document.body.append(popup)
  const preview = popup.contentWindow!
  const open = vi.spyOn(window, 'open').mockReturnValue(preview)
  const createPdf = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
  const revoke = vi.fn()
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = () => 'blob:report'
      static revokeObjectURL = revoke
    },
  )
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([0]))))

  const printing = printReportPdf(createPdf)
  expect(open).toHaveBeenCalledWith('', '_blank')
  expect(createPdf).not.toHaveBeenCalled()
  await printing

  const frame = preview.document.querySelector('iframe')!
  expect(frame.getAttribute('src')).toBe('blob:report')
  expect(preview.document.querySelector('a')?.getAttribute('href')).toBe('blob:report')
  const print = vi.spyOn(frame.contentWindow!, 'print').mockImplementation(() => {})
  vi.spyOn(frame.contentWindow!, 'focus').mockImplementation(() => {})
  frame.dispatchEvent(new Event('load'))
  expect(print).toHaveBeenCalledOnce()

  preview.dispatchEvent(new Event('pagehide'))
  expect(revoke).toHaveBeenCalledWith('blob:report')
})
