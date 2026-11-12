import { useCallback, useState } from 'react'
import { Button, Modal } from '@heroui/react'
import { Camera, LoaderCircle, ScanLine, SwitchCamera } from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'
import { useLabelCamera } from '../device-scanning/use-label-camera'
import { imageCanvas } from '../device-scanning/label-scanner'
import { cameraFrameCrop } from '../device-scanning/camera-frame'

export function DeviceCameraDialog({
  onClose,
  onCapture,
}: {
  onClose: () => void
  onCapture: (image: HTMLCanvasElement) => void
}) {
  useAppTranslation()
  const camera = useLabelCamera(true)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [captureError, setCaptureError] = useState<string | null>(null)
  const { start, videoRef } = camera
  // The modal portal can mount after this component's effects. Start only once its video exists.
  const attachVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      if (node) void start('environment')
    },
    [start, videoRef],
  )
  function capture() {
    const video = videoRef.current
    if (!camera.active || !video?.videoWidth || !video.videoHeight) return
    try {
      const image = imageCanvas(
        video,
        video.videoWidth,
        video.videoHeight,
        cameraFrameCrop(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight),
      )
      camera.stop()
      onCapture(image)
    } catch {
      setCaptureError('Unable to capture the image. Please try again.')
    }
  }
  return (
    <Modal.Backdrop
      isOpen
      isDismissable={false}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="patient-camera-backdrop"
    >
      <Modal.Container
        size="full"
        placement="center"
        scroll="inside"
        className="patient-camera-container"
      >
        <Modal.Dialog className="patient-camera-dialog">
          <Modal.Header className="patient-camera-header">
            <ScanLine size={24} aria-hidden="true" />
            <div>
              <Modal.Heading>{t('Scan device label')}</Modal.Heading>
              <p>{t('Keep the label steady and in focus.')}</p>
            </div>
          </Modal.Header>
          <Modal.CloseTrigger aria-label={t('Close camera')} className="patient-camera-close" />
          <Modal.Body className="patient-camera-viewfinder">
            <video
              ref={attachVideo}
              autoPlay
              muted
              playsInline
              aria-label={t('Device label camera preview')}
            />
            {camera.active && (
              <div className="patient-camera-guide" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
            {camera.opening && (
              <div className="patient-camera-message" role="status">
                <LoaderCircle size={28} className="animate-spin" />
                <p>{t('Opening camera…')}</p>
              </div>
            )}
            {camera.error && (
              <div className="patient-camera-message" role="alert">
                <Camera size={32} />
                <p>{t(camera.error)}</p>
                <Button variant="secondary" onPress={() => void camera.start(facing)}>
                  {t('Try again')}
                </Button>
              </div>
            )}
            {!camera.active && !camera.opening && !camera.error && (
              <div className="patient-camera-message" role="status">
                <Camera size={32} />
                <p>{t('Camera paused')}</p>
                <Button variant="secondary" onPress={() => void camera.start(facing)}>
                  {t('Resume camera')}
                </Button>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="patient-camera-footer">
            <p className="patient-camera-guidance" role={captureError ? 'alert' : undefined}>
              {t(captureError || 'Include the entire label, barcodes and IMEI. Avoid glare.')}
            </p>
            <div className="patient-camera-capture-controls">
              <Button variant="ghost" className="patient-camera-cancel" onPress={onClose}>
                {t('Cancel')}
              </Button>
              <div className="patient-camera-shutter-group">
                <Button
                  isIconOnly
                  className="patient-camera-shutter"
                  aria-label={t('Capture label')}
                  isDisabled={!camera.active || camera.opening}
                  onPress={capture}
                >
                  <Camera size={28} aria-hidden="true" />
                </Button>
                <span>{t('Capture label')}</span>
              </div>
              <Button
                isIconOnly
                variant="ghost"
                className="patient-camera-switch"
                aria-label={t('Switch camera')}
                isDisabled={!camera.active || camera.opening}
                onPress={() => {
                  const next = facing === 'environment' ? 'user' : 'environment'
                  setFacing(next)
                  setCaptureError(null)
                  void camera.start(next)
                }}
              >
                <SwitchCamera size={24} />
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
