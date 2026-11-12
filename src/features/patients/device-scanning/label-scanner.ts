import { parseDeviceLabel, validGtin, validImei, type DeviceLabelFields } from './label-parser'
import { labelTextRegions } from './label-text-regions'
import { enhanceIdentifierLine } from './enhance-identifier-line'
import type { Worker } from 'tesseract.js'

export type ScanResult = {
  fields: Partial<DeviceLabelFields>
  barcodeCount: number
  textRead: boolean
}
const asset = (name: string) =>
  new URL(`${import.meta.env.BASE_URL}scanner/${name}`, window.location.origin).href

export function createLabelScanner() {
  let workerPromise: Promise<Worker> | undefined
  let disposed = false
  let progress: (value: number) => void = () => {}
  let progressStart = 0.2
  let progressSpan = 0.35
  function worker() {
    workerPromise ??= import('tesseract.js')
      .then(({ createWorker, OEM }) =>
        createWorker('eng', OEM.LSTM_ONLY, {
          workerPath: asset('worker.min.js'),
          corePath: asset('core'),
          langPath: asset(''),
          workerBlobURL: false,
          logger: (message) => {
            if (!disposed)
              progress(
                message.status === 'recognizing text'
                  ? progressStart + message.progress * progressSpan
                  : 0.1,
              )
          },
        }),
      )
      .catch((error: unknown) => {
        workerPromise = undefined
        throw error
      })
    return workerPromise
  }
  return {
    async scan(image: HTMLCanvasElement, onProgress: (value: number) => void): Promise<ScanResult> {
      if (disposed) throw new Error('Scanner closed')
      progress = onProgress
      progressStart = 0.2
      progressSpan = 0.35
      const { readBarcodes, prepareZXingModule } = await import('zxing-wasm/reader')
      prepareZXingModule({
        overrides: {
          locateFile: (file: string, prefix: string) =>
            file.endsWith('.wasm') ? asset('zxing_reader.wasm') : prefix + file,
        },
      })
      const context = image.getContext('2d')
      if (!context) throw new Error('Image processing unavailable')
      const barcodes = await readBarcodes(context.getImageData(0, 0, image.width, image.height), {
        formats: ['DataMatrix', 'Code128', 'Code39', 'QRCode', 'EAN13', 'EAN8', 'UPCA', 'ITF'],
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
        textMode: 'HRI',
        maxNumberOfSymbols: 12,
      })
      if (disposed) throw new Error('Scanner closed')
      let text = ''
      let textRead = false
      try {
        const ocr = await worker()
        if (disposed) throw new Error('Scanner closed')
        const result = await ocr.recognize(image)
        text = result.data.text
        textRead = true
      } catch (error) {
        if (disposed || !barcodes.length) throw error
        // Barcode values remain useful if text recognition could not start.
      }
      const fields = parseDeviceLabel(barcodes, text)
      const hasIdentifiers = () =>
        validGtin(fields.gtin ?? '') && !!fields.serialNumber && validImei(fields.imei ?? '')
      // Dense graphics can prevent whole-image OCR from finding the small identifier lines.
      // Locate rows of text and read them separately, without assuming a vendor's label layout.
      if (textRead && !hasIdentifiers()) {
        try {
          const regions = labelTextRegions(context.getImageData(0, 0, image.width, image.height))
          const ocr = await worker()
          for (const [index, rectangle] of regions.entries()) {
            if (disposed) throw new Error('Scanner closed')
            progressStart = 0.55 + (index / regions.length) * 0.4
            progressSpan = 0.4 / regions.length
            const result = await ocr.recognize(image, { rectangle })
            const candidate = parseDeviceLabel([], result.data.text)
            if (!validGtin(fields.gtin ?? '') && validGtin(candidate.gtin ?? ''))
              fields.gtin = candidate.gtin
            if (!validImei(fields.imei ?? '') && validImei(candidate.imei ?? ''))
              fields.imei = candidate.imei
            if (!validImei(fields.imei ?? '') && /\bIMEI\b/i.test(result.data.text)) {
              // Remove the padding above a detected IMEI line: it can include the
              // bottom edge of an adjacent barcode and distort digit recognition.
              const inset = Math.min(9, Math.floor(rectangle.height * 0.22))
              if (disposed) throw new Error('Scanner closed')
              const focusedRectangle = {
                ...rectangle,
                top: rectangle.top + inset,
                height: rectangle.height - inset,
              }
              const focused = await ocr.recognize(image, { rectangle: focusedRectangle })
              const focusedImei = parseDeviceLabel([], focused.data.text).imei
              if (validImei(focusedImei ?? '')) fields.imei = focusedImei
              else {
                // Padding and contrast affect small digits differently across captures.
                // Try bounded alternatives rather than relying on one crop/contrast pair.
                const moderateInset = Math.min(6, Math.floor(rectangle.height * 0.14))
                const variants = [
                  { rectangle: focusedRectangle, gamma: 2 },
                  {
                    rectangle: {
                      ...rectangle,
                      top: rectangle.top + moderateInset,
                      height: rectangle.height - moderateInset,
                    },
                    gamma: 1,
                  },
                  { rectangle, gamma: 1.5 },
                ]
                for (const variant of variants) {
                  if (disposed) throw new Error('Scanner closed')
                  const enhanced = await ocr.recognize(
                    enhanceIdentifierLine(image, variant.rectangle, variant.gamma),
                  )
                  const enhancedImei = parseDeviceLabel([], enhanced.data.text).imei
                  if (validImei(enhancedImei ?? '')) {
                    fields.imei = enhancedImei
                    break
                  }
                }
              }
            }
            if (
              !fields.serialNumber &&
              candidate.serialNumber &&
              /^[\x20-\x7e]+$/.test(candidate.serialNumber)
            )
              fields.serialNumber = candidate.serialNumber
            fields.name ||= candidate.name
            if (hasIdentifiers()) break
          }
        } catch (error) {
          if (disposed) throw error
          // Keep values already read if a fallback OCR pass fails.
        }
      }
      if (disposed) throw new Error('Scanner closed')
      onProgress(1)
      return { fields, barcodeCount: barcodes.length, textRead }
    },
    dispose() {
      disposed = true
      progress = () => {}
      void workerPromise?.then((instance) => instance.terminate()).catch(() => {})
    },
  }
}

export function imageCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  crop?: { x: number; y: number; width: number; height: number },
) {
  const frame = crop ?? { x: 0, y: 0, width, height }
  const scale = Math.min(1, 2400 / Math.max(frame.width, frame.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(frame.width * scale))
  canvas.height = Math.max(1, Math.round(frame.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image processing unavailable')
  context.drawImage(
    source,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  return canvas
}
export async function loadLabelImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image')
    return imageCanvas(image, image.naturalWidth, image.naturalHeight)
  } finally {
    URL.revokeObjectURL(url)
  }
}
