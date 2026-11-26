import { numberFormatter, translate as t } from '@/i18n'
import {
  formatPressure,
  pressureBands,
  pressureCategory,
  pressureDate,
  pressureSeries,
  summarizePressure,
  type PressureReading,
} from './blood-pressure-report'
import { createMonitoringPdf, type MonitoringPdf } from './monitoring-pdf'

const whole = numberFormatter({ maximumFractionDigits: 0 })
const percent = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })

export function createBloodPressurePdf(
  patient: { id: string; name: string; device: string; readings: PressureReading[] },
  logo: ArrayBuffer,
) {
  return createMonitoringPdf(bloodPressurePdfReport(patient), logo)
}

export function bloodPressurePdfReport(
  patient: { id: string; name: string; device: string; readings: PressureReading[] },
  total = patient.readings.length,
): MonitoringPdf<PressureReading> {
  const { readings } = patient
  const summary = summarizePressure(readings)
  return {
    title: t('Blood pressure'),
    patient,
    accent: '#65549b',
    panel: '#f2eef9',
    metrics: [
      [t('Latest reading'), `${formatPressure(readings[readings.length - 1]!)} mmHg`],
      [t('Average blood pressure'), `${formatPressure(summary.average)} mmHg`],
      [t('Readings in normal range'), percent.format(summary.normalFraction)],
      [t('Reading Count'), String(total)],
    ],
    chart: {
      title: t('Blood pressure trend'),
      unit: 'mmHg',
      categoriesTitle: t('Blood pressure categories'),
      ticks: [40, 80, 120, 160, 200],
      series: pressureSeries.map(({ key, label, color }) => ({
        value: (reading: PressureReading) => reading[key],
        label: t(label),
        color: key === 'systolic' ? '#65549b' : color,
        dashed: key === 'diastolic',
      })),
    },
    categories: Object.entries(pressureBands).map(([id, band]) => ({
      label: t(band.label),
      color: band.color,
      count: `${summary.counts[id as keyof typeof pressureBands]} / ${readings.length}`,
    })),
    category: (reading) => {
      const band = pressureBands[pressureCategory(reading)]
      return { color: band.color, label: t(band.label) }
    },
    insights: [
      [
        [
          t('Stage 2 or severe readings'),
          `${summary.counts.stage2 + summary.counts.severe} / ${readings.length}`,
        ],
      ],
      [[t('Severe-range readings'), `${summary.counts.severe} / ${readings.length}`]],
      [
        [t('Peak systolic'), `${summary.peakSystolic} mmHg`],
        [t('Peak diastolic'), `${summary.peakDiastolic} mmHg`],
      ],
      [[t('Average pulse'), `${whole.format(summary.averagePulse)} bpm`]],
    ],
    history: {
      valueLabel: t('Blood pressure (mmHg)'),
      contextLabel: t('Pulse (bpm)'),
      date: (reading) => pressureDate.format(reading.timestamp),
      value: formatPressure,
      context: (reading) => (reading.pulse ? String(reading.pulse) : '—'),
    },
  }
}
