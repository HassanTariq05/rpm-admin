import { lazy, Suspense, useState, useSyncExternalStore } from 'react'
import axios from 'axios'
import { Button } from '@heroui/react'
import { CheckCircle2, ScanLine, Send } from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'
import { useSubmitAssignmentScan } from '@/hooks/use-device-assignment-tokens'
import {
  assignmentTokenError,
  type ScanTokenSource,
} from '@/services/patient-services/device-assignment-tokens'
import { emptyDeviceLabel, validImei } from '../device-scanning/label-parser'
import { readScanHandoff } from '../device-scanning/scan-handoff'
import { useScanExpiry } from '../device-scanning/use-scan-expiry'
import '../device-scanning/device-scan-handoff.css'
const Scanner = lazy(() =>
  import('../components/patient-assign-device').then((module) => ({
    default: module.PatientAssignDevice,
  })),
)
const subscribe = (notify: () => void) => {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}
function ScanSession({
  handoff,
}: {
  handoff: { token: string; expiresAt: string; sourceType?: ScanTokenSource }
}) {
  const [draft, setDraft] = useState({ ...emptyDeviceLabel })
  const submit = useSubmitAssignmentScan(handoff.sourceType)
  const { expired, remaining } = useScanExpiry(handoff.expiresAt, !submit.isSuccess)
  if (
    axios.isAxiosError(submit.error) &&
    [400, 404, 409, 410].includes(submit.error.response?.status ?? 0)
  )
    return (
      <div className="public-scan-message" role="alert">
        <ScanLine size={40} />
        <h1>{t('Scan link unavailable')}</h1>
        <p>{t(assignmentTokenError(submit.error))}</p>
      </div>
    )
  if (submit.isSuccess)
    return (
      <div className="public-scan-message" role="status">
        <CheckCircle2 size={48} />
        <h1>{t('Device details sent')}</h1>
        <p>
          {t(
            handoff.sourceType === 'device_creation'
              ? 'Return to Add Device to review and save the device.'
              : 'Return to the original assignment screen to review and assign the device.',
          )}
        </p>
      </div>
    )
  if (expired)
    return (
      <div className="public-scan-message" role="alert">
        <ScanLine size={40} />
        <h1>{t('Scan link expired')}</h1>
        <p>{t('Generate a new QR code on the original screen and scan it again.')}</p>
      </div>
    )
  return (
    <>
      <header className="public-scan-header">
        <span>
          <ScanLine size={24} />
        </span>
        <div>
          <h1>{t('Scan device label')}</h1>
          <p>{t('Capture the label, review the details, then send them back.')}</p>
        </div>
        <p role="timer">{t('Expires in {{time}}', { time: remaining })}</p>
      </header>
      <Suspense fallback={<p role="status">{t('Loading device scanner…')}</p>}>
        <Scanner
          showClassification={handoff.sourceType === 'device_creation'}
          values={draft}
          onChange={setDraft}
          pending={submit.isPending}
          actions={(scanning) => (
            <>
              {submit.isError && (
                <p className="patient-scanner-error" role="alert">
                  {t(assignmentTokenError(submit.error))}
                </p>
              )}
              <Button
                variant="primary"
                isPending={submit.isPending}
                isDisabled={scanning || submit.isPending || !validImei(draft.imei)}
                onPress={() => {
                  if (
                    scanning ||
                    submit.isPending ||
                    !validImei(draft.imei) ||
                    Date.now() >= Date.parse(handoff.expiresAt)
                  )
                    return
                  submit.mutate({
                    token: handoff.token,
                    name: draft.name.trim(),
                    gtin: draft.gtin.trim(),
                    serialNumber: draft.serialNumber.trim(),
                    imei: draft.imei.trim(),
                    ...(handoff.sourceType === 'device_creation'
                      ? {
                          ...(draft.vendor ? { vendor: draft.vendor } : {}),
                          ...(draft.deviceType ? { deviceType: draft.deviceType } : {}),
                        }
                      : {}),
                  })
                }}
              >
                <Send size={16} />
                {t('Send device details')}
              </Button>
            </>
          )}
        />
      </Suspense>
    </>
  )
}
export function PublicDeviceScanPage() {
  useAppTranslation()
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
  const handoff = readScanHandoff(hash)
  return (
    <main className="device-scan-public">
      <div className="public-scan-shell">
        {handoff ? (
          <ScanSession
            key={`${handoff.sourceType ?? 'patient_device_assoc'}:${handoff.token}`}
            handoff={handoff}
          />
        ) : (
          <div className="public-scan-message" role="alert">
            <ScanLine size={40} />
            <h1>{t('Scan link unavailable')}</h1>
            <p>
              {t(
                'Scan a valid QR code from Add Device or the patient assignment screen to continue.',
              )}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
