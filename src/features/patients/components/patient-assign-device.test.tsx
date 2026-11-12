import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientAssignDevice } from './patient-assign-device'
import { emptyDeviceLabel } from '../device-scanning/label-parser'
const state = vi.hoisted(() => ({ scan: vi.fn(), dispose: vi.fn(), load: vi.fn() }))
vi.mock('../device-scanning/label-scanner', () => ({
  createLabelScanner: () => ({ scan: state.scan, dispose: state.dispose }),
  loadLabelImage: state.load,
  imageCanvas: vi.fn(),
}))
function Form() {
  const [values, setValues] = useState({ ...emptyDeviceLabel })
  return <PatientAssignDevice values={values} onChange={setValues} />
}
const image = new File(['photo'], 'device.jpg', { type: 'image/jpeg' })
beforeEach(() => {
  vi.clearAllMocks()
  state.load.mockResolvedValue({ toDataURL: () => 'data:image/jpeg;base64,AA==' })
  state.scan.mockResolvedValue({
    fields: {
      name: 'iBloodPressure Classic',
      gtin: '00869876000084',
      serialNumber: '10E234602640',
      imei: '864370061571354',
    },
    barcodeCount: 2,
    textRead: true,
  })
})
afterEach(cleanup)
it('reports an incomplete read when OCR finds a name without the identifiers', async () => {
  state.scan.mockResolvedValue({
    fields: { name: 'iBloodPressure' },
    barcodeCount: 0,
    textRead: true,
  })
  render(<Form />)
  fireEvent.change(screen.getByLabelText('Upload device label'), { target: { files: [image] } })
  await screen.findByText(
    'Only part of the label was read. Move closer, keep the label in focus, and capture again to read the missing identifiers.',
  )
  expect(
    screen.queryByText('Label read. Review each field before assigning the device.'),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'GTIN' })).toHaveValue('')
})
it('fills uploaded label values, preserves manual edits on later scans and keeps assignment unavailable', async () => {
  render(<Form />)
  fireEvent.change(screen.getByLabelText('Upload device label'), { target: { files: [image] } })
  await screen.findByText('Label read. Review each field before assigning the device.')
  expect(screen.getByRole('textbox', { name: 'GTIN' })).toHaveValue('00869876000084')
  expect(screen.getByRole('textbox', { name: 'Serial Number' })).toHaveValue('10E234602640')
  expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('864370061571354')
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
    target: { value: 'My monitor' },
  })
  state.scan.mockResolvedValue({
    fields: { name: 'Different scan' },
    barcodeCount: 0,
    textRead: true,
  })
  fireEvent.change(screen.getByLabelText('Upload device label'), { target: { files: [image] } })
  await waitFor(() => expect(state.scan).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(screen.queryByText('Reading label…')).not.toBeInTheDocument())
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('My monitor')
  expect(screen.getByRole('button', { name: 'Assign Device' })).toBeDisabled()
})
it('rejects unsupported files and lets users correct or clear invalid identifiers', () => {
  render(<Form />)
  fireEvent.change(screen.getByLabelText('Upload device label'), {
    target: { files: [new File(['bad'], 'bad.pdf', { type: 'application/pdf' })] },
  })
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')
  expect(state.scan).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: 'IMEI' }), { target: { value: '123' } })
  expect(screen.getByText('Check the 15-digit IMEI and its check digit.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Clear details' }))
  expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('')
})
it('disposes the scanner and ignores recognition that finishes after closing', async () => {
  let resolve!: (value: unknown) => void
  state.scan.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const change = vi.fn()
  const view = render(<PatientAssignDevice values={{ ...emptyDeviceLabel }} onChange={change} />)
  fireEvent.change(screen.getByLabelText('Upload device label'), { target: { files: [image] } })
  await waitFor(() => expect(state.scan).toHaveBeenCalled())
  view.unmount()
  await act(async () =>
    resolve({ fields: { imei: '864370061571354' }, barcodeCount: 1, textRead: true }),
  )
  expect(state.dispose).toHaveBeenCalledOnce()
  expect(change).not.toHaveBeenCalled()
})
