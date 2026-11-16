import { beforeEach, expect, it, vi } from 'vitest'
import { placeAddressFields, searchAddresses, type AddressSearchSession } from './address-services'
const api = vi.hoisted(() => ({
  fetch: vi.fn(),
  fields: vi.fn(),
  setOptions: vi.fn(),
  env: { googleMapsApiKey: 'browser-test-key' },
}))
vi.mock('@/lib/env', () => ({ env: api.env }))
vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: api.setOptions,
  importLibrary: vi.fn(async () => ({
    AutocompleteSessionToken: class {},
    AutocompleteSuggestion: { fetchAutocompleteSuggestions: api.fetch },
  })),
}))
const component = (longText: string, type: string) => ({
  longText,
  shortText: longText,
  types: [type],
})
const components = [
  component('Berlin', 'locality'),
  component('Berlin State', 'administrative_area_level_1'),
  component('Germany', 'country'),
  component('00123', 'postal_code'),
]
beforeEach(() => {
  vi.clearAllMocks()
  api.env.googleMapsApiKey = 'browser-test-key'
  api.fields.mockResolvedValue({})
  api.fetch.mockResolvedValue({
    suggestions: [
      {
        placePrediction: {
          placeId: 'place-1',
          text: { text: 'Main Street, Berlin' },
          mainText: { text: 'Main Street' },
          secondaryText: { text: 'Berlin' },
          toPlace: () => ({
            formattedAddress: '10 Main Street, Berlin, Germany',
            addressComponents: components,
            fetchFields: api.fields,
          }),
        },
      },
    ],
  })
})
it('extracts location components and supports postal towns without inventing missing values', () => {
  expect(placeAddressFields(components)).toEqual({
    city: 'Berlin',
    state: 'Berlin State',
    country: 'Germany',
    postalCode: '00123',
  })
  expect(placeAddressFields([component('London', 'postal_town')])).toEqual({
    city: 'London',
    state: '',
    country: '',
    postalCode: '',
  })
  expect(placeAddressFields()).toEqual({ city: '', state: '', country: '', postalCode: '' })
})
it('uses the new autocomplete API, reuses the session and fetches only address details on selection', async () => {
  const session: AddressSearchSession = {}
  const signal = new AbortController().signal
  const results = await searchAddresses(' Main Street ', signal, session)
  const token = session.token
  expect(token).toBeDefined()
  expect(api.fetch).toHaveBeenLastCalledWith({ input: 'Main Street', sessionToken: token })
  await searchAddresses('Main Street Berlin', signal, session)
  expect(session.token).toBe(token)
  expect(api.fields).not.toHaveBeenCalled()
  expect(await results[0]!.resolve!()).toMatchObject({
    address: '10 Main Street, Berlin, Germany',
    city: 'Berlin',
    state: 'Berlin State',
    country: 'Germany',
    postalCode: '00123',
  })
  expect(api.fields).toHaveBeenCalledWith({ fields: ['formattedAddress', 'addressComponents'] })
  expect(session.token).toBeUndefined()
  await searchAddresses('Another street', signal, session)
  expect(session.token).not.toBe(token)
})
it('skips short or cancelled searches and ignores cancelled results', async () => {
  const controller = new AbortController()
  expect(await searchAddresses('ab', controller.signal)).toEqual([])
  controller.abort()
  expect(await searchAddresses('Main Street', controller.signal)).toEqual([])
  expect(api.fetch).not.toHaveBeenCalled()
  const pending = new AbortController()
  api.fetch.mockImplementation(async () => {
    pending.abort()
    return { suggestions: [] }
  })
  expect(await searchAddresses('Main Street', pending.signal)).toEqual([])
})
it('provides an error when no browser API key is configured', async () => {
  api.env.googleMapsApiKey = ''
  await expect(searchAddresses('Main Street', new AbortController().signal)).rejects.toThrow(
    'Address search is not configured',
  )
  expect(api.fetch).not.toHaveBeenCalled()
})

it('extracts extended ZIP codes and keeps missing postal codes empty', () => {
  expect(
    placeAddressFields([component('01234', 'postal_code'), component('5678', 'postal_code_suffix')])
      .postalCode,
  ).toBe('01234-5678')
  expect(placeAddressFields([component('5678', 'postal_code_suffix')]).postalCode).toBe('')
})
