import { useEffect, useRef, useState } from 'react'
import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import {
  Barcode,
  Camera,
  CheckCircle2,
  Hash,
  ImagePlus,
  LoaderCircle,
  MonitorSmartphone,
  RotateCcw,
  ScanLine,
  SwitchCamera,
  X,
} from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  emptyDeviceLabel,
  validGtin,
  validImei,
  type DeviceLabelFields,
} from '../device-scanning/label-parser'
import { createLabelScanner, imageCanvas, loadLabelImage } from '../device-scanning/label-scanner'
import { useLabelCamera } from '../device-scanning/use-label-camera'
import '../device-scanning/device-scanning.css'

const fields = [
  { name: 'name', label: 'Name', placeholder: 'Enter device name', icon: MonitorSmartphone },
  { name: 'gtin', label: 'GTIN', placeholder: 'Enter GTIN', icon: Barcode },
  { name: 'serialNumber', label: 'Serial Number', placeholder: 'Enter serial number', icon: Hash },
  { name: 'imei', label: 'IMEI', placeholder: 'Enter 15-digit IMEI', icon: ScanLine },
] as const

export function PatientAssignDevice({
  values,
  onChange,
}: {
  values: DeviceLabelFields
  onChange: (
    values: DeviceLabelFields | ((current: DeviceLabelFields) => DeviceLabelFields),
  ) => void
}) {
  useAppTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  const image = useRef<HTMLCanvasElement | null>(null)
  const scanner = useRef<ReturnType<typeof createLabelScanner> | null>(null)
  const run = useRef(0)
  const edited = useRef(
    new Set<keyof DeviceLabelFields>(
      fields.filter(({ name }) => values[name]).map(({ name }) => name),
    ),
  )
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const camera = useLabelCamera(true)
  useEffect(
    () => () => {
      run.current++
      scanner.current?.dispose()
      scanner.current = null
    },
    [],
  )

  async function scan(canvas: HTMLCanvasElement) {
    const request = ++run.current
    setBusy(true)
    setError(null)
    setResult(null)
    setProgress(0)
    image.current = canvas
    setPreview(canvas.toDataURL('image/png'))
    try {
      scanner.current?.dispose()
      scanner.current = createLabelScanner()
      const output = await scanner.current.scan(canvas, (value) => {
        if (request === run.current) setProgress(value)
      })
      if (request !== run.current) return
      const found = Object.keys(output.fields).length
      if (!found) {
        setError(
          'No readable device details were found. Try a sharper, closer photo or enter the fields manually.',
        )
        return
      }
      onChange((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(output.fields).filter(
            ([key]) => !edited.current.has(key as keyof DeviceLabelFields),
          ),
        ),
      }))
      setResult(
        !validGtin(output.fields.gtin ?? '') ||
          !output.fields.serialNumber ||
          !validImei(output.fields.imei ?? '')
          ? 'Only part of the label was read. Move closer, keep the label in focus, and capture again to read the missing identifiers.'
          : output.textRead
            ? 'Label read. Review each field before assigning the device.'
            : 'Barcodes read, but printed text could not be read. Enter the device name manually.',
      )
    } catch {
      if (request === run.current)
        setError('Unable to read this label. Try another image or enter the details manually.')
    } finally {
      if (request === run.current) setBusy(false)
    }
  }
  async function upload(file?: File) {
    if (!file || busy) return
    camera.stop()
    setError(null)
    setResult(null)
    setProgress(0)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Choose an image smaller than 20 MB.')
      return
    }
    const request = ++run.current
    setBusy(true)
    try {
      const canvas = await loadLabelImage(file)
      if (request !== run.current) return
      await scan(canvas)
    } catch {
      if (request === run.current) {
        setBusy(false)
        setError('This image could not be opened. Choose a JPEG, PNG or WebP image.')
      }
    }
  }
  async function capture() {
    const video = camera.videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setError('The camera is still starting. Try capturing again.')
      return
    }
    const canvas = imageCanvas(video, video.videoWidth, video.videoHeight)
    camera.stop()
    await scan(canvas)
  }
  function clear() {
    run.current++
    camera.stop()
    image.current = null
    setPreview(null)
    setResult(null)
    setError(null)
    edited.current.clear()
    onChange({ ...emptyDeviceLabel })
  }
  return (
    <div className="patient-device-assignment">
      <section className="patient-assignment-form" aria-label={t('Device details')}>
        <div className="patient-assignment-heading">
          <span>
            <MonitorSmartphone size={20} />
          </span>
          <div>
            <h3>{t('Device details')}</h3>
            <p>{t('Scan the label or enter the details below.')}</p>
          </div>
        </div>
        <div className="patient-assignment-fields">
          {fields.map(({ name, label, placeholder, icon: Icon }) => {
            const invalid =
              name === 'gtin'
                ? !!values.gtin && !validGtin(values.gtin)
                : name === 'imei'
                  ? !!values.imei && !validImei(values.imei)
                  : false
            return (
              <TextField
                key={name}
                className="w-full"
                name={name}
                value={values[name]}
                isInvalid={invalid}
                onChange={(value) => {
                  edited.current.add(name)
                  onChange((current) => ({
                    ...current,
                    [name]: name === 'gtin' || name === 'imei' ? value.replace(/\s/g, '') : value,
                  }))
                }}
              >
                <Label className="text-xs font-semibold">{t(label)}</Label>
                <div className="relative">
                  <Icon size={17} className="patient-assignment-input-icon" aria-hidden="true" />
                  <Input
                    className="w-full pl-10"
                    inputMode={name === 'gtin' || name === 'imei' ? 'numeric' : 'text'}
                    placeholder={t(placeholder)}
                    autoComplete="off"
                  />
                </div>
                {invalid && (
                  <FieldError>
                    {t(
                      name === 'gtin'
                        ? 'Check the GTIN length and check digit.'
                        : 'Check the 15-digit IMEI and its check digit.',
                    )}
                  </FieldError>
                )}
              </TextField>
            )
          })}
        </div>
        <p className="patient-assignment-hint">
          {t(
            'Scans fill available values and preserve your manual edits. Review all identifiers against the label.',
          )}
        </p>
        <div className="patient-assignment-actions">
          <Button isDisabled variant="primary">
            <MonitorSmartphone size={16} />
            {t('Assign Device')}
          </Button>
          <Button variant="ghost" isDisabled={busy} onPress={clear}>
            <RotateCcw size={15} />
            {t('Clear details')}
          </Button>
        </div>
        <p className="patient-assignment-unavailable">
          {t('Assignment saving is not available yet. You can scan and review device details.')}
        </p>
      </section>
      <section className="patient-label-scanner" aria-label={t('Scan device label')}>
        <div className="patient-assignment-heading">
          <span>
            <ScanLine size={20} />
          </span>
          <div>
            <h3>{t('Scan device label')}</h3>
            <p>{t('Read barcodes and printed text from a device label.')}</p>
          </div>
        </div>
        <div className="patient-scanner-controls">
          <Button
            variant="outline"
            isDisabled={busy || camera.opening}
            onPress={() => fileInput.current?.click()}
          >
            <ImagePlus size={16} />
            {t('Upload image')}
          </Button>
          {!camera.active ? (
            <Button
              variant="primary"
              isPending={camera.opening}
              isDisabled={busy || camera.opening}
              onPress={() => {
                setError(null)
                void camera.start(facing)
              }}
            >
              <Camera size={16} />
              {t('Open camera')}
            </Button>
          ) : (
            <>
              <Button variant="primary" isDisabled={busy} onPress={() => void capture()}>
                <Camera size={16} />
                {t('Capture label')}
              </Button>
              <Button
                variant="outline"
                isIconOnly
                aria-label={t('Switch camera')}
                onPress={() => {
                  const next = facing === 'environment' ? 'user' : 'environment'
                  setFacing(next)
                  void camera.start(next)
                }}
              >
                <SwitchCamera size={16} />
              </Button>
              <Button
                variant="ghost"
                isIconOnly
                aria-label={t('Stop camera')}
                onPress={camera.stop}
              >
                <X size={16} />
              </Button>
            </>
          )}
          {!camera.active && preview && (
            <Button
              variant="ghost"
              isDisabled={busy}
              onPress={() => {
                if (image.current) void scan(image.current)
              }}
            >
              <ScanLine size={16} />
              {t('Read again')}
            </Button>
          )}
        </div>
        <div
          className={`patient-scanner-preview ${camera.active || camera.opening ? 'is-camera' : ''}`}
        >
          <video
            ref={camera.videoRef}
            autoPlay
            muted
            playsInline
            aria-label={t('Device label camera preview')}
            className={camera.active || camera.opening ? '' : 'is-hidden'}
          />
          {!camera.active &&
            !camera.opening &&
            (preview ? (
              <img src={preview} alt={t('Device label preview')} />
            ) : (
              <div className="patient-scanner-empty">
                <ScanLine size={40} />
                <strong>{t('Place the device label in view')}</strong>
                <p>
                  {t(
                    'Include the name, Data Matrix code and IMEI barcode. Use good lighting and avoid glare.',
                  )}
                </p>
              </div>
            ))}
          {(camera.active || camera.opening) && (
            <div className="patient-camera-frame" aria-hidden="true" />
          )}
          {busy && (
            <div className="patient-scanner-progress" role="status">
              <LoaderCircle size={24} className="animate-spin" />
              <span>
                {t('Reading label…')} {Math.round(progress * 100)}%
              </span>
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          hidden
          tabIndex={-1}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('Upload device label')}
          disabled={busy || camera.opening}
          onChange={(event) => {
            void upload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        {(error || camera.error) && (
          <p className="patient-scanner-error" role="alert">
            {t(error || camera.error)}
          </p>
        )}
        {result && (
          <p className="patient-scanner-result" role="status">
            <CheckCircle2 size={16} />
            {t(result)}
          </p>
        )}
        <p className="patient-assignment-hint">
          {t(
            'Images are processed on this device and are not uploaded. Live camera access needs HTTPS or localhost.',
          )}
        </p>
      </section>
    </div>
  )
}
