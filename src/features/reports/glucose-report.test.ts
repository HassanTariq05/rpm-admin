import { expect, it } from 'vitest'
import { glucoseBand, mockGlucosePatients, summarizeGlucose } from './glucose-report'

it('uses consistent boundaries for the five glucose bands', () => {
  expect([53, 54, 69, 70, 180, 181, 250, 251].map((value) => glucoseBand(value).id)).toEqual([
    'very-low',
    'low',
    'low',
    'in-range',
    'in-range',
    'high',
    'high',
    'very-high',
  ])
})

it('summarizes only the selected patient’s readings', () => {
  const [avery, jordan, riley] = mockGlucosePatients
  expect(summarizeGlucose(avery!.readings)).toMatchObject({
    counts: { 'very-low': 0, low: 1, 'in-range': 21, high: 5, 'very-high': 1 },
    largest: { value: 263 },
  })
  expect(summarizeGlucose(jordan!.readings).rangeFraction).toBe(1)
  expect(summarizeGlucose(riley!.readings).smallest.value).toBe(51)
})
