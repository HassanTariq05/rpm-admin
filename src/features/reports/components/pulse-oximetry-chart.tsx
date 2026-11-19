import { translate as t } from '@/i18n'
import {
  oximetryBand,
  oximetryBands,
  oximetryDate,
  oximetryTicks,
  type OximetryReading,
} from '../pulse-oximetry-report'
import { SingleReadingTrend } from './single-reading-trend'

export function PulseOximetryChart({
  readings,
  device,
}: {
  readings: OximetryReading[]
  device: string
}) {
  return (
    <SingleReadingTrend
      readings={readings}
      title={t('Oxygen saturation trend')}
      unit="%"
      bands={oximetryBands}
      legend={t('SpO₂ ranges')}
      ticks={oximetryTicks}
      bandFor={(reading) => oximetryBand(reading.value)}
      readingDate={oximetryDate.format}
      readingInfo={(reading) =>
        `${t('Pulse {{value}}', { value: `${reading.pulse} bpm` })} · ${device}`
      }
    />
  )
}
