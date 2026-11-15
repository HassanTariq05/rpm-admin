import '../device-scanning/device-scan-handoff.css'
import { useEffect, useRef, useState } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Copy, LoaderCircle, QrCode, RefreshCw, Smartphone } from 'lucide-react'
import { useCreateAssignmentToken, useAssignmentToken } from '@/hooks/use-device-assignment-tokens'
import { assignmentTokenError } from '@/services/patient-services/device-assignment-tokens'
import { translate as t, useAppTranslation } from '@/i18n'
import { scanHandoffUrl, scanPayloadFields } from '../device-scanning/scan-handoff'
import { useScanExpiry } from '../device-scanning/use-scan-expiry'
import type { DeviceLabelFields } from '../device-scanning/label-parser'

export function DeviceScanHandoff({
  patientId,
  onReceived,
}: {
  patientId: string
  onReceived: (fields: Partial<DeviceLabelFields>) => void
}) {
  useAppTranslation()
  const create = useCreateAssignmentToken()
  const { mutate } = create
  const started = useRef<string | null>(null)
  const applied = useRef<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (started.current === patientId) return
    started.current = patientId
    mutate(patientId)
  }, [patientId, mutate])
  const token = create.data
  const query = useAssignmentToken(
    token,
    !create.isPending && !create.isError && !!token && Date.parse(token.expiresAt) > Date.now(),
  )
  const received =
    !!query.data?.usedAt && query.data.patientId === patientId && query.data.token === token?.token
  const { expired, remaining } = useScanExpiry(query.data?.expiresAt ?? token?.expiresAt, !received)
  const url = token ? scanHandoffUrl(window.location.origin, token.token, token.expiresAt) : ''
  useEffect(() => {
    if (!received || !query.data || applied.current === query.data.token) return
    applied.current = query.data.token
    onReceived(scanPayloadFields(query.data.requestPayload))
  }, [received, query.data, onReceived])
  function regenerate() {
    setCopied(false)
    create.mutate(patientId)
  }
  return (
    <section
      className="patient-label-scanner patient-scan-handoff"
      aria-label={t('Scan with another device')}
    >
      <div className="patient-assignment-heading">
        <span>
          <Smartphone size={20} />
        </span>
        <div>
          <h3>{t('Scan with another device')}</h3>
          <p>{t('Use your phone camera to scan this QR code.')}</p>
        </div>
      </div>
      {create.isPending || create.isIdle ? (
        <div className="patient-handoff-state" role="status">
          <LoaderCircle className="animate-spin" size={28} />
          <p>{t('Creating scan link…')}</p>
        </div>
      ) : create.isError ? (
        <div role="alert" className="patient-handoff-state">
          <p>{t(assignmentTokenError(create.error))}</p>
          <Button variant="outline" onPress={regenerate}>
            {t('Try again')}
          </Button>
        </div>
      ) : received ? (
        <div className="patient-handoff-state patient-handoff-complete" role="status">
          <CheckCircle2 size={42} />
          <h3>{t('Scan received')}</h3>
          <p>{t('Review the device details, then assign the device.')}</p>
          <Button variant="outline" onPress={regenerate}>
            {t('Scan another label')}
          </Button>
        </div>
      ) : expired ? (
        <div className="patient-handoff-state" role="status">
          <QrCode size={36} />
          <h3>{t('QR code expired')}</h3>
          <p>{t('Generate a new QR code to continue scanning.')}</p>
          <Button variant="primary" onPress={regenerate}>
            <RefreshCw size={16} />
            {t('Generate new QR code')}
          </Button>
        </div>
      ) : token ? (
        <>
          <div className="patient-handoff-qr">
            <QRCodeSVG
              value={url}
              size={224}
              marginSize={4}
              level="M"
              title={t('Device scanning QR code')}
            />
          </div>
          <p className="patient-handoff-timer" role="timer">
            {t('Expires in {{time}}', { time: remaining })}
          </p>
          <ol className="patient-handoff-steps">
            <li>{t('Scan the QR code with your phone.')}</li>
            <li>{t('Capture the device label and send its details.')}</li>
            <li>{t('The details will appear here automatically.')}</li>
          </ol>
          <TextField className="w-full" value={url} isReadOnly>
            <Label>{t('Scan link')}</Label>
            <Input onFocus={(event) => event.target.select()} />
          </TextField>
          <Button
            variant="outline"
            onPress={() => {
              void navigator.clipboard
                ?.writeText(url)
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }}
          >
            <Copy size={16} />
            {t(copied ? 'Link copied' : 'Copy link')}
          </Button>
          {query.isError ? (
            <div role="alert" className="patient-scanner-error">
              <p>{t(assignmentTokenError(query.error))}</p>
              <Button variant="ghost" size="sm" onPress={() => void query.refetch()}>
                {t('Try again')}
              </Button>
            </div>
          ) : (
            <p className="patient-assignment-hint" role="status">
              {t('Waiting for device details…')}
            </p>
          )}
          {['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && (
            <p className="patient-assignment-hint">
              {t('Use your deployed HTTPS site to scan from another device.')}
            </p>
          )}
        </>
      ) : null}
    </section>
  )
}
