import { numberFormatter, translate as t } from '@/i18n'
import {
  glucoseBand,
  glucoseBands,
  glucoseDate,
  summarizeGlucose,
  type GlucoseReading,
} from './glucose-report'
import { createMonitoringPdf } from './monitoring-pdf'

const whole = numberFormatter({ maximumFractionDigits: 0 })
const percent = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })

export function createGlucosePdf(
  patient: { id: string; name: string; device: string; readings: GlucoseReading[] },
  logo: ArrayBuffer,
) {
  const { readings } = patient
  const summary = summarizeGlucose(readings)
  const upper = Math.max(300, Math.ceil(summary.largest.value / 50) * 50)
  return createMonitoringPdf(
    {
      title: t('Blood Glucose'),
      patient,
      accent: '#0d735c',
      panel: '#edf7f5',
      metrics: [
        [t('Latest reading'), `${readings[readings.length - 1]!.value} mg/dL`],
        [t('Average glucose'), `${whole.format(summary.average)} mg/dL`],
        [t('Readings in range'), percent.format(summary.rangeFraction)],
        [t('Total readings'), String(readings.length)],
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
        detail: `${band.range} · ${summary.counts[band.id]}`,
      })),
      category: (reading) => {
        const band = glucoseBand(reading.value)
        return { color: band.color, label: t(band.label) }
      },
      insights: [
        `${t('Above range')}: ${summary.counts.high + summary.counts['very-high']} · ${t('Peak {{value}} mg/dL', { value: summary.largest.value })}`,
        `${t('Below range')}: ${summary.counts.low + summary.counts['very-low']} · ${t('Lowest {{value}} mg/dL', { value: summary.smallest.value })}`,
        `${t('Fasting')}: ${whole.format(summary.fastingAverage)} mg/dL · ${t('After meal')}: ${whole.format(summary.afterMealAverage)} mg/dL`,
      ],
      history: {
        valueLabel: t('Glucose (mg/dL)'),
        contextLabel: t('Meal context'),
        date: (reading) => glucoseDate.format(reading.timestamp),
        value: (reading) => String(reading.value),
        context: (reading) => t(reading.context),
      },
    },
    logo,
  )
}
