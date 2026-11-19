import { expect, it } from 'vitest'
import { mockOximetryPatients, oximetryBand, summarizeOximetry } from './pulse-oximetry-report'

it('uses consistent boundaries for the three demonstration bands', () => {
  expect([89, 90, 94, 95, 100].map((value) => oximetryBand(value).id)).toEqual([
    'very-low',
    'low',
    'low',
    'in-range',
    'in-range',
  ])
})

it('counts low readings and retains the original lowest reading with its pulse', () => {
  const readings = mockOximetryPatients[2]!.readings
  const summary = summarizeOximetry(readings)
  expect(summary.counts).toEqual({ 'very-low': 2, low: 7, 'in-range': 5 })
  expect(summary.lowest).toBe(readings[7])
  expect(summary.lowest).toMatchObject({ value: 88, pulse: 93 })
})
