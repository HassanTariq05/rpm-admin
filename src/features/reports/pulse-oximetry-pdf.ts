import { numberFormatter, translate as t } from '@/i18n'
import {
  oximetryBand,
  oximetryBands,
  oximetryDate,
  oximetryPercent,
  oximetryTicks,
  summarizeOximetry,
  type OximetryReading,
} from './pulse-oximetry-report'
import { createMonitoringPdf, type MonitoringPdf } from './monitoring-pdf'

const whole = numberFormatter({ maximumFractionDigits: 0 })
const formatOxygen = (value: number) => oximetryPercent.format(value / 100)

export function createPulseOximetryPdf(
  patient: { id: string; name: string; device: string; readings: OximetryReading[] },
  logo: ArrayBuffer,
) {
  return createMonitoringPdf(pulseOximetryPdfReport(patient), logo)
}

export function pulseOximetryPdfReport(
  patient: { id: string; name: string; device: string; readings: OximetryReading[] },
  total = patient.readings.length,
): MonitoringPdf<OximetryReading> {
  const { readings } = patient
  const summary = summarizeOximetry(readings)
  const latest = readings[readings.length - 1]!
  return {
    title: t('Pulse oximetry'),
    patient,
    accent: '#3069bc',
    panel: '#edf4fc',
    metrics: [
      [t('Latest reading'), formatOxygen(latest.value)],
      [t('Average oxygen saturation'), formatOxygen(summary.average)],
      [t('Readings in range'), oximetryPercent.format(summary.rangeFraction)],
      [t('Reading Count'), String(total)],
    ],
    chart: {
      title: t('Oxygen saturation trend'),
      unit: '%',
      categoriesTitle: t('Oxygen saturation ranges'),
      ticks: oximetryTicks,
      bands: [...oximetryBands],
      series: [{ value: (reading) => reading.value }],
    },
    categories: oximetryBands.map((band) => ({
      label: t(band.label),
      color: band.color,
      range: band.range,
      count: String(summary.counts[band.id]),
    })),
    category: (reading) => {
      const band = oximetryBand(reading.value)
      return { color: band.color, label: t(band.label) }
    },
    insights: [
      [
        [
          t('Below range'),
          `${summary.counts.low + summary.counts['very-low']} / ${readings.length}`,
        ],
        [t('Very low readings'), `${summary.counts['very-low']} / ${readings.length}`],
      ],
      [
        [t('Lowest oxygen saturation'), formatOxygen(summary.lowest.value)],
        [null, oximetryDate.format(summary.lowest.timestamp)],
      ],
      [
        [t('Average pulse'), `${whole.format(summary.averagePulse)} bpm`],
        [t('Latest pulse'), `${latest.pulse} bpm`],
      ],
    ],
    history: {
      valueLabel: t('Oxygen saturation (%)'),
      contextLabel: t('Pulse (bpm)'),
      date: (reading) => oximetryDate.format(reading.timestamp),
      value: (reading) => formatOxygen(reading.value),
      context: (reading) => String(reading.pulse),
    },
  }
}
