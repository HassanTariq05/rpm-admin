import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { env } from '@/lib/env'
export interface AddressDetails {
  address: string
  city: string
  state: string
  country: string
  postalCode?: string
}
export interface AddressSuggestion extends AddressDetails {
  id: string
  title: string
  description: string
  resolve?: () => Promise<AddressDetails>
}
export interface AddressSearchSession {
  token?: google.maps.places.AutocompleteSessionToken
}
let configured = false
async function placesLibrary() {
  if (!env.googleMapsApiKey) throw new Error('Address search is not configured')
  if (!configured) {
    setOptions({ key: env.googleMapsApiKey, v: 'weekly' })
    configured = true
  }
  return (await importLibrary('places')) as google.maps.PlacesLibrary
}
export function placeAddressFields(
  components: readonly Pick<google.maps.places.AddressComponent, 'longText' | 'types'>[] = [],
) {
  const part = (type: string) =>
    components.find((component) => component.types.includes(type))?.longText || ''
  const postalCode = part('postal_code')
  const suffix = part('postal_code_suffix')
  return {
    postalCode: postalCode ? [postalCode, suffix].filter(Boolean).join('-') : '',
    city: part('locality') || part('postal_town') || part('sublocality_level_1'),
    state: part('administrative_area_level_1'),
    country: part('country'),
  }
}
export async function lookupSavedAddress(address: string, signal: AbortSignal) {
  if (!env.googleMapsApiKey || !address.trim() || signal.aborted) return null
  const { Place } = await placesLibrary()
  if (signal.aborted) return null
  const { places } = await Place.searchByText({
    textQuery: address,
    fields: ['formattedAddress', 'addressComponents'],
  })
  if (signal.aborted) return null
  const normalize = (value: string) =>
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  const saved = normalize(address)
  const match = places.find((place) => normalize(place.formattedAddress ?? '') === saved)
  return match ? { address, ...placeAddressFields(match.addressComponents) } : null
}

export async function searchAddresses(
  input: string,
  signal: AbortSignal,
  session: AddressSearchSession = {},
): Promise<AddressSuggestion[]> {
  if (input.trim().length < 3 || signal.aborted) return []
  const places = await placesLibrary()
  if (signal.aborted) return []
  session.token ??= new places.AutocompleteSessionToken()
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: input.trim(),
    sessionToken: session.token,
  })
  if (signal.aborted) return []
  return suggestions.flatMap(({ placePrediction: prediction }) => {
    if (!prediction) return []
    const address = prediction.text.text
    const suggestion: AddressSuggestion = {
      id: prediction.placeId,
      title: prediction.mainText?.text || address,
      description: prediction.secondaryText?.text || '',
      address,
      city: '',
      state: '',
      country: '',
    }
    return [
      {
        ...suggestion,
        resolve: async () => {
          const place = prediction.toPlace()
          try {
            await place.fetchFields({ fields: ['formattedAddress', 'addressComponents'] })
            return {
              ...suggestion,
              address: place.formattedAddress || address,
              ...placeAddressFields(place.addressComponents),
            }
          } finally {
            // A selected place ends this billing session. Further searches start a new one.
            session.token = undefined
          }
        },
      },
    ]
  })
}
