import { useEffect, useState } from 'react'
import {
  lookupSavedAddress,
  type AddressDetails,
} from '@/services/address-services/address-services'

export function useSavedAddressDetails(address: string) {
  const [result, setResult] = useState<{ address: string; details: AddressDetails | null }>()
  useEffect(() => {
    if (!address) return
    const controller = new AbortController()
    const finish = (details: AddressDetails | null) => {
      if (!controller.signal.aborted) setResult({ address, details })
    }
    void lookupSavedAddress(address, controller.signal)
      .then(finish)
      .catch(() => finish(null))
    return () => controller.abort()
  }, [address])

  const current = result?.address === address ? result : undefined
  return {
    details: current?.details,
    isLoading: Boolean(address && !current),
  }
}
