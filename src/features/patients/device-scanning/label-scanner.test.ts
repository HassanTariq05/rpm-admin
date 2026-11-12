import { beforeEach, expect, it, vi } from 'vitest'
import { createLabelScanner } from './label-scanner'
const mock = vi.hoisted(() => ({
  recognize: vi.fn(),
  barcodes: vi.fn(),
  regions: vi.fn(),
  enhanced: {},
}))
vi.mock('./enhance-identifier-line', () => ({ enhanceIdentifierLine: () => mock.enhanced }))
vi.mock('tesseract.js', () => ({
  OEM: { LSTM_ONLY: 1 },
  createWorker: async () => ({ recognize: mock.recognize, terminate: vi.fn() }),
}))
vi.mock('zxing-wasm/reader', () => ({ readBarcodes: mock.barcodes, prepareZXingModule: vi.fn() }))
vi.mock('./label-text-regions', () => ({ labelTextRegions: mock.regions }))
const canvas = {
  width: 1280,
  height: 720,
  getContext: () => ({ getImageData: () => ({}) }),
} as unknown as HTMLCanvasElement
beforeEach(() => {
  vi.clearAllMocks()
  mock.barcodes.mockResolvedValue([])
  mock.regions.mockReturnValue([
    { left: 100, top: 100, width: 300, height: 70 },
    { left: 200, top: 300, width: 300, height: 40 },
  ])
})
it('recovers identifiers from text regions when whole-frame OCR only reads the product name', async () => {
  mock.recognize
    .mockResolvedValueOnce({ data: { text: 'iBloodPressure Classic' } })
    .mockResolvedValueOnce({ data: { text: '(01)00869876000084\n(21)10E234602640' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI:86437006157 1354' } })
  const scanner = createLabelScanner()
  const output = await scanner.scan(canvas, vi.fn())
  expect(output.fields).toEqual({
    name: 'iBloodPressure Classic',
    gtin: '00869876000084',
    serialNumber: '10E234602640',
    imei: '864370061571354',
  })
  expect(mock.recognize).toHaveBeenCalledTimes(3)
  scanner.dispose()
})
it('keeps barcode identifiers and skips fallback OCR when the initial read is complete', async () => {
  mock.barcodes.mockResolvedValue([
    { text: '(01)00869876000084(21)10E234602640' },
    { text: '864370061571354' },
  ])
  mock.recognize.mockResolvedValue({ data: { text: 'iBloodPressure Classic\n(01)00869676000084' } })
  const scanner = createLabelScanner()
  expect((await scanner.scan(canvas, vi.fn())).fields.gtin).toBe('00869876000084')
  expect(mock.regions).not.toHaveBeenCalled()
  scanner.dispose()
})

it('preserves a partial read if a fallback pass fails', async () => {
  mock.recognize
    .mockResolvedValueOnce({ data: { text: 'iBloodPressure’ Classic' } })
    .mockRejectedValueOnce(new Error('OCR failed'))
  const scanner = createLabelScanner()
  expect((await scanner.scan(canvas, vi.fn())).fields).toEqual({ name: 'iBloodPressure Classic' })
  scanner.dispose()
})

it('retries a missed IMEI line without the barcode edge and accepts only a checksum-valid result', async () => {
  mock.barcodes.mockResolvedValue([{ text: '(01)00869876000084(21)10E234602640' }])
  mock.regions.mockReturnValue([{ left: 529, top: 502, width: 263, height: 43 }])
  mock.recognize
    .mockResolvedValueOnce({ data: { text: 'iBloodPressure Classic' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 8647006157 1384' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI B64370061571354' } })
  const scanner = createLabelScanner()
  expect((await scanner.scan(canvas, vi.fn())).fields.imei).toBe('864370061571354')
  expect(mock.recognize).toHaveBeenLastCalledWith(canvas, {
    rectangle: { left: 529, top: 511, width: 263, height: 34 },
  })
  scanner.dispose()
})

it('enhances a faint IMEI line after a focused crop still has digit errors', async () => {
  mock.barcodes.mockResolvedValue([{ text: '(01)00869876000084(21)10E234602640' }])
  mock.regions.mockReturnValue([{ left: 529, top: 502, width: 263, height: 43 }])
  mock.recognize
    .mockResolvedValueOnce({ data: { text: 'iBloodPressure Classic' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 86437006167 1384' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 88437006 15671384' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 86437006157 1354' } })
  const scanner = createLabelScanner()
  expect((await scanner.scan(canvas, vi.fn())).fields.imei).toBe('864370061571354')
  expect(mock.recognize).toHaveBeenLastCalledWith(mock.enhanced)
  scanner.dispose()
})

it('tries a less cropped, neutral-contrast variant when stronger contrast still misreads digits', async () => {
  mock.barcodes.mockResolvedValue([{ text: '(01)00869876000084(21)10E234602640' }])
  mock.regions.mockReturnValue([{ left: 591, top: 483, width: 248, height: 44 }])
  mock.recognize
    .mockResolvedValueOnce({ data: { text: '' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 86437006157 1384' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 8647006157 1384' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 86437006157 1384' } })
    .mockResolvedValueOnce({ data: { text: 'IMEI 86437006 157 1354' } })
  const scanner = createLabelScanner()
  expect((await scanner.scan(canvas, vi.fn())).fields.imei).toBe('864370061571354')
  expect(mock.recognize).toHaveBeenCalledTimes(5)
  scanner.dispose()
})
