import { z } from 'zod'

export const maxSummaryGroups = 24
export const maxSummaryPoints = 48
export const maxSummaryRequestBytes = 180_000
export const reportAiSummaryPath = '/api/rpm-reading-summary'

const metric = z.enum(['systolic', 'diastolic', 'pulse', 'glucose', 'spo2', 'weightKg', 'celsius'])
const classification = z.enum([
  'normal',
  'elevated',
  'stage1',
  'stage2',
  'severe',
  'very-low',
  'low',
  'in-range',
  'high',
  'very-high',
])
const readingPoint = z.strictObject({
  index: z.number().int().min(1),
  day: z.number().int().min(0),
  values: z.partialRecord(metric, z.number()),
  band: classification.optional(),
})
const metricStatistics = z.strictObject({ min: z.number(), max: z.number(), mean: z.number() })

export const reportAiInputSchema = z.strictObject({
  language: z.enum(['en', 'es']),
  selectedDays: z.number().int().min(1).nullable(),
  groups: z
    .array(
      z.strictObject({
        type: z.enum(['blood_pressure', 'blood_glucose', 'pulse_ox', 'weight', 'thermometer']),
        recorded: z.number().int().min(1),
        usable: z.number().int().min(1),
        stats: z.partialRecord(metric, metricStatistics),
        counts: z.partialRecord(classification, z.number().int().min(0)),
        points: z.array(readingPoint).min(1).max(maxSummaryPoints),
      }),
    )
    .min(1)
    .max(maxSummaryGroups),
})

export type ReportAiInput = z.infer<typeof reportAiInputSchema>
export type ReportAiGroup = ReportAiInput['groups'][number]
export type ReportAiPoint = ReportAiGroup['points'][number]

export const reportAiOutputSchema = z.strictObject({
  devices: z
    .array(
      z.strictObject({
        group: z.number().int().min(0),
        overview: z.string().trim().min(1).max(500),
        events: z
          .array(
            z.strictObject({
              index: z.number().int().min(1),
              description: z.string().trim().min(1).max(220),
            }),
          )
          .max(3),
      }),
    )
    .min(1)
    .max(maxSummaryGroups),
})

export type ReportAiOutput = z.infer<typeof reportAiOutputSchema>

export function matchesReportInput(output: ReportAiOutput, input: ReportAiInput) {
  return (
    output.devices.length === input.groups.length &&
    new Set(output.devices.map(({ group }) => group)).size === input.groups.length &&
    output.devices.every(({ group, events }) => {
      const source = input.groups[group]
      return (
        source && events.every(({ index }) => source.points.some((point) => point.index === index))
      )
    })
  )
}
