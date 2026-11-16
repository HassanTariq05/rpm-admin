import { companies, deviceTypes, typeValues } from '@/lib/device-catalog'

export interface DeviceLabelFields {
  name: string
  gtin: string
  serialNumber: string
  imei: string
  vendor?: string
  deviceType?: string
}
export const emptyDeviceLabel: DeviceLabelFields = {
  name: '',
  gtin: '',
  serialNumber: '',
  imei: '',
}
// Values match the existing device-create API and dropdown options.
export const scanCompanies = companies.map((label) => ({
  id: label === 'SmartMeter' ? 'smart_meter' : 'pylo',
  label,
}))
export const scanDeviceTypes = deviceTypes.map((label) => ({ id: typeValues[label], label }))
function editDistance(left: string, right: string) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 0; i < left.length; i++) {
    const current = [i + 1]
    for (let j = 0; j < right.length; j++)
      current.push(
        Math.min(
          current[j]! + 1,
          previous[j + 1]! + 1,
          previous[j]! + Number(left[i] !== right[j]),
        ),
      )
    previous = current
  }
  return previous[right.length]!
}
export function recognizeLabelCompany(text: string): string | undefined {
  const matches = new Set<string>()
  if (/\bsmart[\s_-]*meter\b/i.test(text)) matches.add('smart_meter')
  // Search every line, including manufacturer/address text, rather than only the product name.
  for (const line of text.split(/\r?\n/)) {
    const words =
      line
        .toLowerCase()
        .replace(/[01|5]/g, (glyph) => ({ '0': 'o', '1': 'l', '|': 'l', '5': 's' })[glyph]!)
        .match(/[a-z]+/g) ?? []
    const manufacturerLine = /manufactur|company|vendor|brand|distribut/i.test(line)
    for (let start = 0; start < words.length; start++) {
      for (let count = 1; count <= 4 && start + count <= words.length; count++) {
        const candidate = words.slice(start, start + count).join('')
        if (
          candidate.length >= 8 &&
          candidate.length <= 12 &&
          editDistance(candidate.replace(/rn/g, 'm'), 'smartmeter') <= 2
        )
          matches.add('smart_meter')
        // Pylo is short: accept common OCR glyph errors everywhere, and other single-letter
        // mistakes only on manufacturer lines to avoid matching unrelated label text.
        if (
          candidate.replace(/i/g, 'l') === 'pylo' ||
          (manufacturerLine && candidate.length === 4 && editDistance(candidate, 'pylo') === 1)
        )
          matches.add('pylo')
      }
    }
  }
  return matches.size === 1 ? [...matches][0] : undefined
}
export function recognizeDeviceClassification(text: string): Partial<DeviceLabelFields> {
  const types = [
    [/\b(?:i?blood[\s_-]*pressure|sphygmomanometer|bp[\s_-]*(?:cuff|monitor))\b/i, 'bp-cuff'],
    [/\b(?:i?blood[\s_-]*glucose|i?glucose|glucometer)\b/i, 'glucometer'],
    [/\b(?:i?weight|(?:body|weighing|digital|smart)[\s_-]*scale|scale)\b/i, 'scale'],
    [/\b(?:oximeter|oximetry|pulse[\s_-]*ox|spo2)\b/i, 'oximeter'],
    [/\b(?:thermometer|i?temperature)\b/i, 'thermometer'],
  ] as const
  // Conflicting matches are left for review rather than guessing.
  const vendor = recognizeLabelCompany(text)
  const deviceType = types.filter(([pattern]) => pattern.test(text))
  return {
    ...(vendor ? { vendor } : {}),
    ...(deviceType.length === 1 ? { deviceType: deviceType[0]![1] } : {}),
  }
}
export type LabelBarcode = { text: string; format?: string }

export function validGtin(value: string) {
  if (!/^(?:\d{8}|\d{12,14})$/.test(value)) return false
  const digits = [...value].reverse().map(Number)
  return digits.reduce((sum, digit, index) => sum + digit * (index % 2 ? 3 : 1), 0) % 10 === 0
}
export function validImei(value: string) {
  if (!/^\d{15}$/.test(value)) return false
  return (
    [...value].reverse().reduce((sum, character, index) => {
      let digit = Number(character)
      if (index % 2) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      return sum + digit
    }, 0) %
      10 ===
    0
  )
}
const cleanIdentifier = (value: string) => value.replace(/[\s-]/g, '')

function gs1(raw: string): Partial<DeviceLabelFields> {
  // ZXing HRI uses parentheses. Also accept scanner/FNC1 element strings.
  const input = raw
    .replace(/^\][A-Za-z]\d/, '')
    .split(String.fromCharCode(29))
    .join('|')
    .trim()
  const fields: Partial<DeviceLabelFields> = {}
  const gtin = input.match(/\(01\)\s*(\d{14})(?!\d)/)?.[1]
  const serial = input.match(/\(21\)\s*([^|\r\n(]{1,20})/)?.[1]?.trim()
  if (gtin) fields.gtin = gtin
  if (serial) fields.serialNumber = serial
  if (input.startsWith('01') && /^01\d{14}/.test(input)) {
    fields.gtin = input.slice(2, 16)
    let tail = input.slice(16).replace(/^\|/, '')
    // Fixed-width date AIs may precede the variable-length serial number.
    while (/^(11|12|13|15|16|17)\d{6}/.test(tail)) tail = tail.slice(8).replace(/^\|/, '')
    if (tail.startsWith('21'))
      fields.serialNumber = tail.slice(2).split('|')[0]?.slice(0, 20).trim()
    else {
      const serialSegment = tail.split('|').find((part) => part.startsWith('21'))
      if (serialSegment) fields.serialNumber = serialSegment.slice(2, 22).trim()
    }
  }
  // GS1 Digital Link QR codes, without opening or fetching the scanned URL.
  const digitalGtin = input.match(/\/01\/(\d{14})(?:\/|\?|$)/)?.[1]
  const digitalSerial = input.match(/\/21\/([^/?#]+)/)?.[1]
  if (digitalGtin) fields.gtin = digitalGtin
  if (digitalSerial) {
    try {
      fields.serialNumber = decodeURIComponent(digitalSerial)
    } catch {
      /* Ignore malformed URI data. */
    }
  }
  return fields
}

export function parseDeviceLabel(barcodes: LabelBarcode[], text = ''): Partial<DeviceLabelFields> {
  const fields: Partial<DeviceLabelFields> = {}
  for (const barcode of barcodes) {
    Object.assign(fields, gs1(barcode.text))
    const raw = barcode.text.trim()
    if (/^\d{15}$/.test(raw) && validImei(raw)) fields.imei = raw
    if (/^(EAN|UPC|ITF)/i.test(barcode.format ?? '') && validGtin(raw))
      fields.gtin = raw.padStart(14, '0')
    const explicitImei = raw.match(/\bIMEI\s*[:#=]?\s*(\d{15})\b/i)?.[1]
    if (explicitImei) fields.imei = explicitImei
  }
  const fromText = gs1(text)
  // Decoded barcode identifiers take precedence over OCR candidates.
  fields.gtin ||= fromText.gtin
  fields.serialNumber ||= fromText.serialNumber
  const imei = text.match(/\bIMEI[ \t]*[:#=-]?[ \t]*([\dBOIl|SZ \t-]{15,25})/i)?.[1]
  if (!fields.imei && imei) {
    const candidate = cleanIdentifier(imei)
    if (/^\d{15}$/.test(candidate)) fields.imei = candidate
    else {
      // Only correct familiar OCR glyph substitutions in explicitly labelled IMEI text.
      // A complete 15-digit value with a valid checksum is required; never invent digits.
      const normalized = candidate.replace(
        /[BOIl|SZ]/gi,
        (glyph) =>
          ({ b: '8', o: '0', i: '1', l: '1', '|': '1', s: '5', z: '2' })[glyph.toLowerCase()]!,
      )
      if (validImei(normalized)) fields.imei = normalized
    }
  }
  fields.gtin ||= text.match(/\bGTIN\s*[:#=-]?\s*(\d{8,14})\b/i)?.[1]
  fields.serialNumber ||= text.match(
    /\b(?:S\/?N|Serial(?:\s*(?:Number|No\.?))?)\s*[:#=-]?\s*([A-Z0-9][A-Z0-9.-]{3,24})\b/i,
  )?.[1]
  const explicitName = text.match(
    /(?:^|\n)\s*(?:Device\s+Name|Product\s+Name|Name)\s*[:=-]\s*([^\r\n]{3,100})/i,
  )?.[1]
  const productName = text.match(/iBlood\s*Pressure(?:[®™"“”'’\s]*(?:Classic|Plus|Elite))?/i)?.[0]
  const model = text.match(/\bModel\s*[:#=-]?\s*([A-Z0-9][A-Z0-9 ._-]{2,40})/i)?.[1]
  const description = text
    .split(/\r?\n/)
    .find(
      (line) =>
        /\b(?:blood pressure monitor|glucose meter|pulse oximeter|thermometer|weight scale)\b/i.test(
          line,
        ) && !/rating|adapter|manufactured/i.test(line),
    )
  const name = explicitName || productName || description || model
  if (name)
    fields.name = name
      .replace(/[®™"“”'’]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100)
  Object.assign(
    fields,
    recognizeDeviceClassification([text, ...barcodes.map(({ text }) => text)].join('\n')),
  )
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => !!value))
}
