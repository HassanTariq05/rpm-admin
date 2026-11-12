import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useLabelCamera } from './use-label-camera'
const stop = vi.fn()
const getUserMedia = vi.fn()
const media = { getTracks: () => [{ stop }] } as unknown as MediaStream
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  getUserMedia.mockResolvedValue(media)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function setup() {
  const view = renderHook(({ enabled }) => useLabelCamera(enabled), {
    initialProps: { enabled: true },
  })
  Object.defineProperty(view.result.current.videoRef, 'current', {
    value: { srcObject: null, play: vi.fn().mockResolvedValue(undefined) },
    writable: true,
  })
  return view
}
it('opens video only with a rear camera preference and stops all tracks when hidden', async () => {
  const view = setup()
  await act(async () => view.result.current.start())
  expect(getUserMedia).toHaveBeenCalledWith(
    expect.objectContaining({
      audio: false,
      video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
    }),
  )
  expect(view.result.current.active).toBe(true)
  view.rerender({ enabled: false })
  expect(stop).toHaveBeenCalled()
  expect(view.result.current.active).toBe(false)
})
it('releases a stream that arrives after the scanner is closed', async () => {
  let resolve!: (stream: MediaStream) => void
  getUserMedia.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const view = setup()
  let request!: Promise<void>
  act(() => {
    request = view.result.current.start()
  })
  view.unmount()
  await act(async () => {
    resolve(media)
    await request
  })
  expect(stop).toHaveBeenCalled()
})
it('explains denied permissions and insecure origins without repeatedly requesting a camera', async () => {
  getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
  const view = setup()
  await act(async () => view.result.current.start())
  expect(view.result.current.error).toContain('permission was denied')
  vi.stubGlobal('isSecureContext', false)
  await act(async () => view.result.current.start())
  expect(view.result.current.error).toContain('requires HTTPS')
  expect(getUserMedia).toHaveBeenCalledTimes(1)
})
