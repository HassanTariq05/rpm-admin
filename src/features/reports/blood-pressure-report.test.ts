import { expect, it } from 'vitest'
import { mockPressurePatients, pressureCategory, summarizePressure } from './blood-pressure-report'

it.each([
  [119, 79, 'normal'],
  [120, 79, 'elevated'],
  [129, 80, 'stage1'],
  [130, 79, 'stage1'],
  [139, 90, 'stage2'],
  [140, 79, 'stage2'],
  [180, 120, 'stage2'],
  [181, 80, 'severe'],
  [115, 121, 'severe'],
] as const)('classifies %i/%i as %s', (systolic, diastolic, category) => {
  expect(pressureCategory({ systolic, diastolic })).toBe(category)
})

it('counts readings by paired severity and summarizes systolic and diastolic independently', () => {
  const readings = mockPressurePatients[2]!.readings
  const summary = summarizePressure(readings)
  expect(summary.counts.severe).toBe(1)
  expect(summary.counts.normal).toBe(0)
  expect(summary.peakSystolic).toBe(183)
  expect(summary.peakDiastolic).toBe(117)
  expect(Object.values(summary.counts).reduce((sum, value) => sum + value, 0)).toBe(readings.length)
})
