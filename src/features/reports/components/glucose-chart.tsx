import { translate as t } from '@/i18n'
import { glucoseBand, glucoseBands, glucoseDate, type GlucoseReading } from '../glucose-report'
import { SingleReadingTrend } from './single-reading-trend'

export function GlucoseChart({ readings, device }: { readings: GlucoseReading[]; device: string }) {
  return (
    <SingleReadingTrend
      readings={readings}
      title={t('Glucose trend')}
      unit="mg/dL"
      bands={glucoseBands}
      legend={t('Glucose ranges')}
      ticks={[0, 54, 70, 110, 180, 250, 300]}
      bandFor={(reading) => glucoseBand(reading.value)}
      readingDate={glucoseDate.format}
      readingInfo={(reading) => `${t(reading.context)} · ${device}`}
    />
  )
}
