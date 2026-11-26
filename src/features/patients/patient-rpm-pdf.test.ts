// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { expect, it } from 'vitest'
import { sampleReadings, thermometerReading } from '@/features/device-readings/readings.fixtures'
import { createPatientRpmPdf } from './patient-rpm-pdf'

it('prints the selected dates, patient details, device charts, insights, and all reading pages', async () => {
  const logo = Uint8Array.from(
    await readFile(new URL('../../../public/icon-192.png', import.meta.url)),
  )
  const bloodGlucose = Array.from({ length: 30 }, (_, index) => ({
    ...sampleReadings[3]!,
    id: `glucose-${index}`,
    recordedAt: new Date(Date.UTC(2026, 9, index + 1, 12)).toISOString(),
    payload: { glucose: 100 + index, before_meal: index % 2 === 0 },
  }))
  const bytes = await createPatientRpmPdf(
    {
      patient: {
        id: 'patient-a',
        isActive: true,
        firstName: 'Alex',
        lastName: 'Test',
        dob: '1980-05-12',
        gender: 'male',
        mrn: 'MRN-123',
      },
      generatedBy: 'Taylor Clinician',
      generatedAt: new Date('2026-11-01T12:00:00Z'),
      from: '2026-10-01',
      to: '2026-10-31',
      devices: ['Glucose meter', 'Pressure monitor', 'Pulse oximeter', 'Thermometer'],
      notes: [
        { spans: [{ text: 'Follow up next week.', bold: true }], indent: 0, quote: false },
        {
          spans: [{ text: 'Review the recorded readings.', italic: true, underline: true }],
          indent: 1,
          quote: true,
        },
      ],
      groups: [
        { type: 'blood_glucose', model: 'Glucose meter', imei: '123456', readings: bloodGlucose },
        { type: 'blood_pressure', model: 'Pressure monitor', readings: sampleReadings.slice(0, 2) },
        {
          type: 'pulse_ox',
          model: 'Pulse oximeter',
          readings: [
            ...Array.from({ length: 8 }, (_, index) => ({
              ...sampleReadings[2]!,
              id: `ox-${index}`,
            })),
            {
              ...sampleReadings[2]!,
              id: 'ox-outside-chart-range',
              recordedAt: '2026-10-29T10:15:00Z',
              payload: { spo2: 120, pulse_bpm: 30 },
            },
          ],
        },
        { type: 'thermometer', model: 'Thermometer', readings: [thermometerReading] },
      ],
    },
    logo.buffer,
  )
  const pdf = await PDFDocument.load(bytes)
  const pages = pdf.getPages().map((page) => {
    const contents = page.node.Contents()!
    const stream = pdf.context.lookup(contents instanceof PDFArray ? contents.get(0) : contents)
    if (!(stream instanceof PDFRawStream)) throw new Error('Expected a PDF page content stream')
    const operators = new TextDecoder().decode(decodePDFRawStream(stream).decode())
    return Array.from(operators.matchAll(/<([0-9a-f]+)> Tj/gi), (match) =>
      Buffer.from(match[1]!, 'hex').toString('latin1'),
    ).join('\n')
  })
  expect(pdf.getTitle()).toBe('RPM Report')
  expect(pages).toHaveLength(9)
  expect(pages[0]).toContain('Alex Test')
  expect(pages[0]).toContain('MRN-123')
  expect(pages[0]).toContain('May 12, 1980')
  expect(pages[0]).toContain('46')
  expect(pages[0]).toContain('Male')
  expect(pages[0]).toContain('1. Glucose meter')
  expect(pages[0]).toContain('4. Thermometer')
  expect(pages[0]).toContain('Devices')
  expect(pages[0]).toContain('Reading Count')
  expect(pages[0]).toContain("Doctor's Notes")
  expect(pages[0]).not.toContain('RPM Report')
  expect(pages[0]).toContain('Taylor Clinician')
  expect(pages[0]).toContain('Oct 1, 2026 - Oct 31, 2026')
  expect(pages[0]).toContain('Follow up next week.')
  expect(pages[0]).toContain('Review the recorded readings.')
  const fonts = pdf.getPage(0).node.Resources()!.lookup(PDFName.of('Font'), PDFDict)
  const faceNames = fonts
    .entries()
    .map(([, ref]) => pdf.context.lookup(ref, PDFDict).get(PDFName.of('BaseFont'))?.toString())
  expect(faceNames).toContain('/Helvetica-Bold')
  expect(faceNames).toContain('/Helvetica-Oblique')
  expect(pages[1]).toContain('Glucose trend')
  expect(pages[1]).toContain('Reading insights')
  expect(pages[1]).toContain('IMEI 123456')
  expect(pages[2]).toContain('Oct 30, 2026')
  expect(pages[2]).toContain('Oct 2, 2026,')
  expect(pages[3]).not.toContain('Oct 2, 2026,')
  expect(pages[3]).toContain('Oct 1, 2026')
  expect(pages[4]).toContain('Severe-range readings')
  expect(pages[6]).toContain('Lowest oxygen saturation')
  expect(pages[7]).toContain('97%')
  expect(pages[7]).toContain('120')
  expect(pages[7]).toContain('Not charted')
  expect(pages[8]).toContain('97.4')
  expect(pages[8]).toContain('Recorded (local time)')
  const displayedTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date('2026-11-01T12:00:00Z'))
  expect(pages[0]).toContain(displayedTime.replace(/[\u00a0\u202f]/g, ' '))
  expect(pages.join('\n')).not.toMatch(/\bUTC\b/)
  expect(pages.join('\n')).not.toMatch(/mock patients|sample readings/i)
})
