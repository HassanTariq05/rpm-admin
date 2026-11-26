import { numberFormatter, translate as t } from '@/i18n'
import {
  glucoseBand,
  glucoseBands,
  glucoseDate,
  summarizeGlucose,
  type GlucoseReading,
} from './glucose-report'
import { createMonitoringPdf, type MonitoringPdf } from './monitoring-pdf'

const whole = numberFormatter({ maximumFractionDigits: 0 })
const formatGlucoseAverage = (value: number) =>
  Number.isFinite(value) ? `${whole.format(value)} mg/dL` : '—'
const percent = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })

export function createGlucosePdf(
  patient: { id: string; name: string; device: string; readings: GlucoseReading[] },
  logo: ArrayBuffer,
) {
  return createMonitoringPdf(glucosePdfReport(patient), logo)
}

export function glucosePdfReport(
  patient: { id: string; name: string; device: string; readings: GlucoseReading[] },
  total = patient.readings.length,
): MonitoringPdf<GlucoseReading> {
  const { readings } = patient
  const summary = summarizeGlucose(readings)
  const upper = Math.max(300, Math.ceil(summary.largest.value / 50) * 50)
  return {
    title: t('Blood Glucose'),
    patient,
    accent: '#0d735c',
    panel: '#edf7f5',
    metrics: [
      [t('Latest reading'), `${readings[readings.length - 1]!.value} mg/dL`],
      [t('Average glucose'), `${whole.format(summary.average)} mg/dL`],
      [t('Readings in range'), percent.format(summary.rangeFraction)],
      [t('Reading Count'), String(total)],
    ],
    chart: {
      title: t('Glucose trend'),
      unit: 'mg/dL',
      categoriesTitle: t('Glucose ranges'),
      ticks: [0, 70, 180, 250, upper],
      bands: glucoseBands.map((band) => ({
        ...band,
        max: band.id === 'very-high' ? upper : band.max,
      })),
      series: [{ value: (reading) => reading.value }],
    },
    categories: glucoseBands.map((band) => ({
      label: t(band.label),
      color: band.color,
      range: band.range,
      count: String(summary.counts[band.id]),
    })),
    category: (reading) => {
      const band = glucoseBand(reading.value)
      return { color: band.color, label: t(band.label) }
    },
    insights: [
      [
        [
          t('Above range'),
          `${summary.counts.high + summary.counts['very-high']} / ${readings.length}`,
        ],
        [t('Peak'), `${summary.largest.value} mg/dL`],
      ],
      [
        [
          t('Below range'),
          `${summary.counts.low + summary.counts['very-low']} / ${readings.length}`,
        ],
        [t('Lowest'), `${summary.smallest.value} mg/dL`],
      ],
      [
        [t('Fasting'), formatGlucoseAverage(summary.fastingAverage)],
        [t('After meal'), formatGlucoseAverage(summary.afterMealAverage)],
      ],
    ],
    history: {
      valueLabel: t('Glucose (mg/dL)'),
      contextLabel: t('Meal context'),
      date: (reading) => glucoseDate.format(reading.timestamp),
      value: (reading) => String(reading.value),
      context: (reading) => t(reading.context),
    },
  }
}
