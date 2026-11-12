import { useCallback, useEffect, useRef, useState } from 'react'

export function useLabelCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const [active, setActive] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stop = useCallback(() => {
    generation.current++
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
    setOpening(false)
  }, [])
  useEffect(() => {
    if (!enabled) stop()
    const onVisibility = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [enabled, stop])
  const start = useCallback(
    async (facing: 'user' | 'environment' = 'environment') => {
      stop()
      if (!enabled) return
      setError(null)
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera access requires HTTPS or localhost. You can upload a label image instead.')
        return
      }
      const request = generation.current
      setOpening(true)
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (request !== generation.current) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream.current = media
        if (!videoRef.current) {
          stop()
          return
        }
        videoRef.current.srcObject = media
        await videoRef.current.play()
        if (request !== generation.current) return
        setActive(true)
      } catch (cause) {
        if (request !== generation.current) return
        stop()
        const name = cause instanceof DOMException ? cause.name : ''
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Camera permission was denied. Allow camera access in your browser or upload an image.'
            : name === 'NotFoundError'
              ? 'No camera was found. Upload a label image instead.'
              : 'Unable to open the camera. Close other apps using it and try again.',
        )
      } finally {
        if (request === generation.current) setOpening(false)
      }
    },
    [enabled, stop],
  )
  return { videoRef, active, opening, error, start, stop }
}
