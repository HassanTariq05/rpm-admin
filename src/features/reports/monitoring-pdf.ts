import { PDFDocument, StandardFonts, rgb, type PDFPage, type RGB } from 'pdf-lib'
import { dateFormatter, translate as t } from '@/i18n'

interface MonitoringPdf<Reading> {
  title: string
  patient: { id: string; name: string; device: string; readings: Reading[] }
  accent: string
  panel: string
  metrics: readonly (readonly [string, string])[]
  chart: {
    title: string
    unit: string
    categoriesTitle: string
    ticks: number[]
    series: {
      value: (reading: Reading) => number
      label?: string
      color?: string
      dashed?: boolean
    }[]
    bands?: { color: string; min: number; max: number }[]
  }
  categories: { label: string; color: string; detail: string }[]
  category: (reading: Reading) => { label: string; color: string }
  insights: string[]
  history: {
    valueLabel: string
    contextLabel: string
    date: (reading: Reading) => string
    value: (reading: Reading) => string
    context: (reading: Reading) => string
  }
}

const shortDate = dateFormatter({ month: 'short', day: 'numeric', timeZone: 'UTC' })
const fullDate = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const pageSize: [number, number] = [612, 792]
const left = 42
const width = 528
const ink = rgb(0.08, 0.14, 0.19)
const muted = rgb(0.33, 0.38, 0.43)
const border = rgb(0.87, 0.91, 0.92)

function pdfColor(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  return rgb((value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255)
}

export async function createMonitoringPdf<Reading extends { timestamp: number }>(
  report: MonitoringPdf<Reading>,
  logoBytes: ArrayBuffer,
) {
  const { patient, chart, metrics, categories, history: historyColumns } = report
  const { readings } = patient
  const accent = pdfColor(report.accent)
  const panel = pdfColor(report.panel)
  const pdf = await PDFDocument.create()
  pdf.setTitle(report.title)
  const [regular, bold, logo] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedPng(logoBytes),
  ])

  function write(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size = 10,
    strong = false,
    color: RGB = ink,
    maxWidth?: number,
  ) {
    page.drawText(text, {
      x,
      y,
      size,
      font: strong ? bold : regular,
      color,
      maxWidth,
      lineHeight: 10,
    })
  }

  function newPage(title: string) {
    const page = pdf.addPage(pageSize)
    page.drawImage(logo, { x: left, y: 725, width: 27, height: 27 })
    write(page, t('Remote Patient Monitoring'), left + 36, 734, 12, true)
    page.drawLine({ start: { x: left, y: 708 }, end: { x: left + width, y: 708 }, color: accent })
    write(page, title, left, 670, 27, true)
    write(page, `${patient.name} · ${patient.id} · ${patient.device}`, left, 647, 10, false, muted)
    return page
  }

  const firstTime = readings[0]!.timestamp
  const lastTime = readings[readings.length - 1]!.timestamp
  const range = `${fullDate.format(firstTime)} – ${fullDate.format(lastTime)} (UTC)`
  const overview = newPage(report.title)
  write(overview, range, left, 630, 10, false, muted)
  write(overview, t('Mock patients and sample readings'), left, 612, 9, true, accent)

  overview.drawRectangle({ x: left, y: 538, width, height: 54, color: panel })
  metrics.forEach(([label, value], index) => {
    const x = left + 12 + index * (width / metrics.length)
    write(overview, label, x, 576, 8, true, muted, width / metrics.length - 20)
    write(overview, value, x, 550, 17, true)
  })

  write(overview, chart.title, left, 508, 15, true)
  const axis = { left: left + 30, bottom: 300, width: width - 36, height: 178 }
  const lower = chart.ticks[0]!
  const upper = chart.ticks[chart.ticks.length - 1]!
  const xAt = (time: number) =>
    axis.left + (axis.width * (time - firstTime)) / Math.max(1, lastTime - firstTime)
  const yAt = (value: number) => axis.bottom + (axis.height * (value - lower)) / (upper - lower)
  for (const band of chart.bands ?? []) {
    overview.drawRectangle({
      x: axis.left,
      y: yAt(band.min),
      width: axis.width,
      height: yAt(band.max) - yAt(band.min),
      color: pdfColor(band.color),
      opacity: 0.08,
    })
  }
  for (const tick of chart.ticks) {
    write(overview, String(tick), left, yAt(tick) - 3, 8, false, muted)
    overview.drawLine({
      start: { x: axis.left, y: yAt(tick) },
      end: { x: axis.left + axis.width, y: yAt(tick) },
      color: border,
      thickness: 0.6,
    })
  }
  for (const [seriesIndex, series] of chart.series.entries()) {
    const stroke = series.color ? pdfColor(series.color) : muted
    for (let index = 1; index < readings.length; index += 1) {
      const previous = readings[index - 1]!
      const current = readings[index]!
      overview.drawLine({
        start: { x: xAt(previous.timestamp), y: yAt(series.value(previous)) },
        end: { x: xAt(current.timestamp), y: yAt(series.value(current)) },
        color: stroke,
        thickness: 0.8,
        dashArray: series.dashed ? [4, 3] : undefined,
      })
    }
    for (const reading of readings) {
      overview.drawCircle({
        x: xAt(reading.timestamp),
        y: yAt(series.value(reading)),
        size: 2.8,
        color: pdfColor(report.category(reading).color),
      })
    }
    if (series.label) {
      const x = left + width - (chart.series.length - seriesIndex) * 93
      overview.drawLine({
        start: { x, y: 488 },
        end: { x: x + 12, y: 488 },
        color: stroke,
        dashArray: series.dashed ? [4, 3] : undefined,
      })
      write(overview, series.label, x + 17, 485, 8, false, muted)
    }
  }
  write(overview, chart.unit, left, 485, 8, false, muted)
  write(overview, shortDate.format(firstTime), axis.left, 285, 8, false, muted)
  const finalLabel = shortDate.format(lastTime)
  write(
    overview,
    finalLabel,
    axis.left + axis.width - regular.widthOfTextAtSize(finalLabel, 8),
    285,
    8,
    false,
    muted,
  )

  write(overview, chart.categoriesTitle, left, 254, 15, true)
  categories.forEach((band, index) => {
    const x = left + index * (width / categories.length)
    overview.drawCircle({ x: x + 3, y: 232, size: 3, color: pdfColor(band.color) })
    write(overview, band.label, x + 10, 229, 8, true, ink, width / categories.length - 17)
    write(overview, band.detail, x + 10, 205, 9, false, muted)
  })

  write(overview, t('Reading insights'), left, 180, 15, true)
  report.insights.forEach((line, index) => write(overview, line, left, 158 - index * 17))
  write(
    overview,
    t('Demo bands are illustrative and are not personalized care targets.'),
    left,
    91,
    9,
    false,
    muted,
  )

  const history = [...readings].reverse()
  const rowsPerPage = 28
  for (let offset = 0; offset < history.length; offset += rowsPerPage) {
    const page = newPage(t('Reading history'))
    const columns = [left + 10, left + 156, left + 286, left + 395]
    page.drawRectangle({ x: left, y: 602, width, height: 27, color: panel })
    const headings = [
      t('Recorded (UTC)'),
      historyColumns.valueLabel,
      historyColumns.contextLabel,
      t('Range'),
    ]
    headings.forEach((heading, index) => write(page, heading, columns[index]!, 612, 9, true))
    history.slice(offset, offset + rowsPerPage).forEach((reading, index) => {
      const y = 587 - index * 19
      if (index % 2 === 0) {
        page.drawRectangle({ x: left, y: y - 5, width, height: 19, color: rgb(0.97, 0.98, 0.98) })
      }
      const band = report.category(reading)
      write(page, historyColumns.date(reading), columns[0]!, y, 9)
      write(page, historyColumns.value(reading), columns[1]!, y, 9, true)
      write(page, historyColumns.context(reading), columns[2]!, y, 9)
      page.drawCircle({ x: columns[3]! + 3, y: y + 3, size: 2.8, color: pdfColor(band.color) })
      write(page, band.label, columns[3]! + 10, y, 9)
    })
  }

  const pages = pdf.getPages()
  pages.forEach((page, index) => {
    page.drawLine({ start: { x: left, y: 44 }, end: { x: left + width, y: 44 }, color: border })
    write(page, range, left, 29, 8, false, muted)
    write(page, `${index + 1} / ${pages.length}`, left + width - 30, 29, 8, false, muted)
  })
  return pdf.save()
}
