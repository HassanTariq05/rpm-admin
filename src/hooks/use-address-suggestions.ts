import { useEffect, useRef, useState } from 'react'
import {
  searchAddresses,
  type AddressSuggestion,
  type AddressSearchSession,
} from '@/services/address-services/address-services'
export function useAddressSuggestions(value: string, enabled: boolean) {
  const query = value.trim()
  const session = useRef<AddressSearchSession>({})
  const [result, setResult] = useState<{
    query: string
    data: AddressSuggestion[]
    status: 'loading' | 'ready' | 'error'
  }>({ query: '', data: [], status: 'ready' })
  useEffect(() => {
    if (!enabled || query.length < 3) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setResult({ query, data: [], status: 'loading' })
      void searchAddresses(query, controller.signal, session.current)
        .then((data) => {
          if (!controller.signal.aborted) setResult({ query, data, status: 'ready' })
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ query, data: [], status: 'error' })
        })
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, enabled])
  const current = enabled && query.length >= 3 && result.query === query
  return {
    data: current ? result.data : [],
    isLoading: enabled && query.length >= 3 && (!current || result.status === 'loading'),
    isError: current && result.status === 'error',
  }
}
