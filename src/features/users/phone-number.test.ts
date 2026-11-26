import { describe, expect, it } from 'vitest'
import {
  formatPhoneNumber,
  joinPhoneNumber,
  resolveCountryCode,
  splitPhoneNumber,
} from './phone-number'

it('formats US phone numbers for display and preserves extensions and international numbers', () => {
  for (const value of ['4155552671', '+14155552671', '1-415-555-2671', '(415) 555-2671']) {
    expect(formatPhoneNumber(value)).toBe('(415) 555-2671')
  }
  expect(formatPhoneNumber('+14155552671 x42')).toBe('(415) 555-2671 ext. 42')
  expect(formatPhoneNumber('+44 20 7123 4567')).toBe('+44 20 7123 4567')
  expect(formatPhoneNumber('3001234567', '+92')).toBe('3001234567')
  expect(formatPhoneNumber('41555')).toBe('41555')
})

describe('user phone numbers', () => {
  it('splits international numbers and preserves them when saved', () => {
    for (const phone of ['+923001234567', '+442071234567', '+14155552671', '+12425551234']) {
      const { countryCode, phoneNumber } = splitPhoneNumber(phone)
      expect(joinPhoneNumber(countryCode, phoneNumber)).toBe(phone)
    }
    expect(splitPhoneNumber('+92 300-1234567')).toEqual({
      countryCode: '+92',
      phoneNumber: '3001234567',
    })
    expect(splitPhoneNumber('00442071234567')).toEqual({
      countryCode: '+44',
      phoneNumber: '2071234567',
    })
  })
  it('combines the chosen code and local number without duplicating pasted prefixes', () => {
    expect(joinPhoneNumber('+92', '300 1234567')).toBe('+923001234567')
    expect(joinPhoneNumber('+1', '+44 20 7123 4567')).toBe('+442071234567')
    const unknown = splitPhoneNumber('+999123456')
    expect(joinPhoneNumber(unknown.countryCode, unknown.phoneNumber)).toBe('+999123456')
  })
})

it('resolves exact codes and unambiguous country searches while preserving ambiguous searches', () => {
  expect(resolveCountryCode('0092')).toBe('+92')
  expect(resolveCountryCode(' +92 ')).toBe('+92')
  expect(resolveCountryCode('CANADA')).toBe('+1')
  expect(resolveCountryCode('pak')).toBe('+92')
  expect(resolveCountryCode('reunion')).toBe('+262')
  expect(resolveCountryCode('9')).toBeUndefined()
  expect(resolveCountryCode('Congo')).toBeUndefined()
  expect(resolveCountryCode('')).toBeUndefined()
})
