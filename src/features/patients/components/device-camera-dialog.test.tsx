import { useState } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientAssignDevice } from './patient-assign-device'
import { emptyDeviceLabel } from '../device-scanning/label-parser'
const api = vi.hoisted(() => ({ scan: vi.fn(), capture: vi.fn(), dispose: vi.fn() }))
vi.mock('../device-scanning/label-scanner', () => ({
  createLabelScanner: () => ({ scan: api.scan, dispose: api.dispose }),
  imageCanvas: api.capture,
  loadLabelImage: vi.fn(),
}))
const getUserMedia = vi.fn()
const stop = vi.fn()
const media = { getTracks: () => [{ stop }] } as unknown as MediaStream
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
function Form() {
  const [values, setValues] = useState({ ...emptyDeviceLabel })
  return <PatientAssignDevice values={values} onChange={setValues} />
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  getUserMedia.mockResolvedValue(media)
  api.capture.mockReturnValue({ toDataURL: () => 'data:image/png;base64,AA==' })
  api.scan.mockResolvedValue({
    fields: {
      name: 'Monitor',
      gtin: '00869876000084',
      serialNumber: 'SERIAL123',
      imei: '864370061571354',
    },
    textRead: true,
    barcodeCount: 2,
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices)
  else Reflect.deleteProperty(navigator, 'mediaDevices')
})
it('opens a separate camera dialog, switches cameras, and closes without losing manual fields', async () => {
  const user = userEvent.setup()
  render(<Form />)
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'My monitor')
  await user.click(screen.getByRole('button', { name: 'Open camera' }))
  const camera = within(await screen.findByRole('dialog', { name: 'Scan device label' }))
  await waitFor(() => expect(camera.getByRole('button', { name: 'Capture label' })).toBeEnabled())
  await user.click(camera.getByRole('button', { name: 'Switch camera' }))
  await waitFor(() =>
    expect(getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: { ideal: 'user' } }),
      }),
    ),
  )
  await user.click(camera.getByRole('button', { name: 'Close camera' }))
  expect(screen.queryByRole('dialog', { name: 'Scan device label' })).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('My monitor')
  expect(stop).toHaveBeenCalled()
  expect(api.scan).not.toHaveBeenCalled()
})
it('captures the full video frame, closes the camera and fills the assignment form from the scan', async () => {
  const user = userEvent.setup()
  render(<Form />)
  await user.click(screen.getByRole('button', { name: 'Open camera' }))
  const camera = within(await screen.findByRole('dialog', { name: 'Scan device label' }))
  const capture = camera.getByRole('button', { name: 'Capture label' })
  await waitFor(() => expect(capture).toBeEnabled())
  const video = camera.getByLabelText('Device label camera preview')
  Object.defineProperties(video, { videoWidth: { value: 1280 }, videoHeight: { value: 720 } })
  await user.click(capture)
  expect(screen.queryByRole('dialog', { name: 'Scan device label' })).not.toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('864370061571354'),
  )
  expect(api.capture).toHaveBeenCalledWith(video, 1280, 720, {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
  })
  expect(stop).toHaveBeenCalled()
  expect(screen.getByRole('img', { name: 'Device label preview' })).toBeInTheDocument()
})
it('explains denied permission inside the camera interface and allows returning to the form', async () => {
  getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
  const user = userEvent.setup()
  render(<Form />)
  await user.click(screen.getByRole('button', { name: 'Open camera' }))
  const camera = within(await screen.findByRole('dialog', { name: 'Scan device label' }))
  expect(await camera.findByRole('alert')).toHaveTextContent('Camera permission was denied')
  expect(camera.getByRole('button', { name: 'Capture label' })).toBeDisabled()
  await user.click(camera.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('releases camera access granted after the camera dialog was closed', async () => {
  let resolve!: (stream: MediaStream) => void
  getUserMedia.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const user = userEvent.setup()
  render(<Form />)
  await user.click(screen.getByRole('button', { name: 'Open camera' }))
  const camera = within(await screen.findByRole('dialog', { name: 'Scan device label' }))
  await user.click(camera.getByRole('button', { name: 'Cancel' }))
  await act(async () => {
    resolve(media)
  })
  expect(stop).toHaveBeenCalled()
  expect(api.scan).not.toHaveBeenCalled()
})
