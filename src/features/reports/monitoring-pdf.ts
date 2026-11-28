import { PDFDocument, StandardFonts, rgb, type PDFPage, type RGB } from 'pdf-lib'
import type { NoteLine, NoteSpan } from '@/features/patients/report-notes'
import { dateFormatter, translate as t } from '@/i18n'

export interface MonitoringPdf<Reading> {
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
  categories: { label: string; color: string; count: string; range?: string }[]
  category: (reading: Reading) => { label: string; color: string }
  insights: (readonly [string | null, string])[][]
  history: {
    valueLabel: string
    contextLabel: string
    date: (reading: Reading) => string
    value: (reading: Reading) => string
    context: (reading: Reading) => string
  }
}

const shortDate = dateFormatter({ month: 'short', day: 'numeric' })
const fullDate = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric' })
const fullTimestamp = dateFormatter({
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
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
  const document = await createMonitoringPdfDocument(report.title, logoBytes)
  document.addReport(report)
  const readings = report.patient.readings
  return document.save(
    `${fullDate.format(readings[0]!.timestamp)} – ${fullDate.format(readings.at(-1)!.timestamp)}`,
  )
}

export async function createMonitoringPdfDocument(title: string, logoBytes: ArrayBuffer) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  const [regular, bold, italic, boldItalic, logo] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.HelveticaOblique),
    pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    pdf.embedPng(logoBytes),
  ])
  const supported = new Set(regular.getCharacterSet())
  const textImages: Promise<void>[] = []
  let canvas: CanvasRenderingContext2D | null | undefined

  function textFont(strong: boolean, slanted: boolean) {
    if (slanted) return strong ? boldItalic : italic
    return strong ? bold : regular
  }

  function cssFont(size: number, strong: boolean, slanted: boolean) {
    return `${slanted ? 'italic ' : ''}${strong ? 'bold ' : ''}${size}px sans-serif`
  }

  function textWidth(text: string, size: number, strong: boolean, slanted = false) {
    const font = textFont(strong, slanted)
    if ([...text].every((char) => supported.has(char.codePointAt(0)!))) {
      return font.widthOfTextAtSize(text, size)
    }
    // Use the browser's font fallback for names or notes beyond Helvetica's character set.
    canvas ??= window.document.createElement('canvas').getContext('2d')
    if (!canvas) throw new Error('PDF font fallback unavailable')
    canvas.font = cssFont(size, strong, slanted)
    return canvas.measureText(text).width
  }

  function wrap(text: string, size: number, strong: boolean, maxWidth = width): string[] {
    return text
      .replace(/[\t\u00a0\u202f]/g, ' ')
      .split(/\r?\n/)
      .flatMap((paragraph) => {
        const lines: string[] = []
        let line = ''
        for (const word of paragraph.trim().split(/ +/)) {
          if (line && textWidth(`${line} ${word}`, size, strong) > maxWidth) {
            lines.push(line)
            line = ''
          }
          if (textWidth(word, size, strong) > maxWidth) {
            for (const char of word) {
              if (line && textWidth(line + char, size, strong) > maxWidth) {
                lines.push(line)
                line = ''
              }
              line += char
            }
          } else {
            line = line ? `${line} ${word}` : word
          }
        }
        return [...lines, line]
      })
  }

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
    const lines = wrap(text, size, strong, maxWidth ?? left + width - x)
    lines.forEach((line, index) => {
      const baseline = y - index * (size + 3)
      drawLine(page, line, x, baseline, size, strong, color)
    })
    return lines.length
  }

  function drawLine(
    page: PDFPage,
    line: string,
    x: number,
    baseline: number,
    size: number,
    strong: boolean,
    color: RGB,
    slanted = false,
  ) {
    if ([...line].every((char) => supported.has(char.codePointAt(0)!))) {
      page.drawText(line, { x, y: baseline, size, font: textFont(strong, slanted), color })
      return
    }
    const lineWidth = textWidth(line, size, strong, slanted)
    const context = canvas!
    const scale = 3
    context.canvas.width = Math.ceil((lineWidth + 4) * scale)
    context.canvas.height = Math.ceil(size * 2 * scale)
    const imageWidth = context.canvas.width / scale
    const imageHeight = context.canvas.height / scale
    context.scale(scale, scale)
    context.font = cssFont(size, strong, slanted)
    context.fillStyle = `rgb(${[color.red, color.green, color.blue].map((channel) => Math.round(channel * 255)).join(',')})`
    context.fillText(line, 2, size * 1.5)
    textImages.push(
      pdf.embedPng(context.canvas.toDataURL()).then((image) => {
        page.drawImage(image, {
          x: x - 2,
          y: baseline - imageHeight + size * 1.5,
          width: imageWidth,
          height: imageHeight,
        })
      }),
    )
  }

  function noteLines(line: NoteLine, available: number, fontSize = 11): NoteSpan[][] {
    const lines: NoteSpan[][] = [[]]
    let used = 0
    for (const span of line.spans) {
      let run: NoteSpan | undefined
      for (const token of span.text.match(/\s+|\S+/g) ?? []) {
        const text = /\s/.test(token[0]!) ? ' ' : token
        const tokenWidth = textWidth(text, fontSize, !!span.bold, !!span.italic)
        const pieces = tokenWidth > available ? Array.from(text) : [text]
        for (const piece of pieces) {
          const size = textWidth(piece, fontSize, !!span.bold, !!span.italic)
          if (used + size > available && piece.trim()) {
            lines.push([])
            used = 0
            run = undefined
          }
          if (!used && !piece.trim()) continue
          if (run) run.text += piece
          else {
            run = { ...span, text: piece }
            lines.at(-1)!.push(run)
          }
          used += size
        }
      }
    }
    return lines
  }

  const neutralPanel = rgb(0.93, 0.95, 0.97)

  function newPage(
    title: string,
    accent = ink,
    headingSize = 27,
    headingFill?: RGB,
    device?: { model: string; range: string; imei?: string },
  ) {
    const page = pdf.addPage(pageSize)
    page.drawImage(logo, { x: left, y: 725, width: 27, height: 27 })
    write(page, t('Remote Patient Monitoring'), left + 36, 734, 12, true)
    page.drawLine({ start: { x: left, y: 708 }, end: { x: left + width, y: 708 }, color: accent })
    if (title) {
      const padding = headingFill ? 12 : 0
      if (headingFill) {
        const bottom = device ? 633 : 657
        page.drawRectangle({ x: left, y: bottom, width, height: 695 - bottom, color: headingFill })
      }
      const available = width - padding * 2
      const titleSize = Math.min(
        headingSize,
        (headingSize * available) / textWidth(title, headingSize, true),
      )
      const x = left + padding
      write(page, title, x, device ? 673 : 670, titleSize, true, ink, available)
      if (device) {
        const metadata = device.imei
          ? `${t('IMEI')} ${device.imei} · ${device.range}`
          : device.range
        for (const [text, y, size, strong] of [
          [device.model, 654, 10, true],
          [metadata, 640, 9, false],
        ] as const) {
          const fit = Math.min(
            size,
            (size * available) / Math.max(1, textWidth(text, size, strong)),
          )
          drawLine(page, text, x, y, fit, strong, strong ? ink : muted)
        }
      }
    }
    return page
  }

  function addOverview(
    fields: readonly (readonly [string, string])[],
    summary: readonly [readonly [string, string], readonly [string, string]],
    sections: { title: string; lines: NoteLine[] }[],
    tags?: { label: string; values: string[] },
  ) {
    let page = newPage('')
    const fieldRows: (typeof fields)[] = []
    for (let index = 0; index < fields.length; index += 2) {
      fieldRows.push(fields.slice(index, index + 2))
    }
    const fieldWidth = width / 2 - 26
    const rowHeights = fieldRows.map(
      (row) =>
        24 + 16 * Math.max(...row.map(([, value]) => wrap(value, 13, false, fieldWidth).length)),
    )
    const cardTop = 694
    const fieldsHeight = rowHeights.reduce((sum, height) => sum + height, 10)
    const chipRows: { text: string; width: number }[][] = []
    const chipGap = 6
    const chipRowHeight = 22
    const chipPanelHeader = 25
    const chipAvailableWidth = width - 24
    let rowWidth = 0
    for (const text of tags?.values ?? []) {
      const chip = { text, width: Math.min(chipAvailableWidth, textWidth(text, 10, true) + 16) }
      if (!chipRows.length || rowWidth + chip.width > chipAvailableWidth) {
        chipRows.push([])
        rowWidth = 0
      }
      chipRows.at(-1)!.push(chip)
      rowWidth += chip.width + chipGap
    }

    function drawTags(rows: typeof chipRows, top: number) {
      if (!rows.length || !tags) return
      write(page, tags.label, left + 12, top - 10, 9, true, muted)
      rows.forEach((row, index) => {
        let x = left + 12
        const bottom = top - 31 - index * chipRowHeight
        for (const chip of row) {
          page.drawRectangle({
            x,
            y: bottom,
            width: chip.width,
            height: 17,
            color: rgb(0.86, 0.9, 0.95),
          })
          const size = Math.min(
            10,
            (10 * (chip.width - 16)) / Math.max(1, textWidth(chip.text, 10, true)),
          )
          drawLine(page, chip.text, x + 8, bottom + 5, size, true, ink)
          x += chip.width + chipGap
        }
      })
    }

    const firstPageCapacity = Math.max(
      0,
      Math.floor((cardTop - fieldsHeight - chipPanelHeader - 110) / chipRowHeight),
    )
    const firstPageTags = chipRows.splice(0, firstPageCapacity)
    const cardHeight =
      fieldsHeight +
      (firstPageTags.length ? chipPanelHeader + firstPageTags.length * chipRowHeight : 0)
    page.drawRectangle({
      x: left,
      y: cardTop - cardHeight,
      width,
      height: cardHeight,
      color: neutralPanel,
    })
    let y = cardTop - 22
    fieldRows.forEach((row, index) => {
      row.forEach(([label, value], column) => {
        const x = left + 12 + column * (width / 2)
        write(page, label, x, y, 9, true, muted)
        write(page, value, x, y - 17, 13, false, ink, fieldWidth)
      })
      y -= rowHeights[index]!
    })
    drawTags(firstPageTags, cardTop - fieldsHeight)
    y -= cardHeight - fieldsHeight + 12

    const continuationCapacity = Math.floor((cardTop - chipPanelHeader - 110) / chipRowHeight)
    while (chipRows.length) {
      page = newPage('')
      const rows = chipRows.splice(0, continuationCapacity)
      const panelHeight = chipPanelHeader + rows.length * chipRowHeight + 10
      page.drawRectangle({
        x: left,
        y: cardTop - panelHeight,
        width,
        height: panelHeight,
        color: neutralPanel,
      })
      drawTags(rows, cardTop - 10)
      y = cardTop - panelHeight - 12
    }

    const [[leftLabel, leftValue], [rightLabel, rightValue]] = summary
    const columnWidth = width / 2 - 20
    const rightX = left + width / 2
    const leftLines = wrap(leftValue, 11, false, columnWidth)
    const rightLines = wrap(rightValue, 11, true, columnWidth)

    function summaryHeading() {
      page.drawLine({
        start: { x: left, y: y + 14 },
        end: { x: left + width, y: y + 14 },
        color: border,
      })
      write(page, leftLabel, left, y - 7, 15, true)
      write(page, rightLabel, rightX, y - 7, 15, true)
      y -= 29
    }

    summaryHeading()
    for (let row = 0; row < Math.max(leftLines.length, rightLines.length); row++) {
      if (y < 66) {
        page = newPage(title)
        y = 634
        summaryHeading()
      }
      if (leftLines[row]) drawLine(page, leftLines[row]!, left, y, 11, false, ink)
      if (rightLines[row]) drawLine(page, rightLines[row]!, rightX, y, 11, true, ink)
      y -= 16
    }
    y -= 15

    for (const section of sections) {
      if (y < 104) {
        page = newPage(section.title)
        y = 634
      } else {
        page.drawLine({
          start: { x: left, y: y + 14 },
          end: { x: left + width, y: y + 14 },
          color: border,
        })
        write(page, section.title, left, y - 7, 15, true)
        y -= 29
      }
      for (const line of section.lines) {
        const indent = Math.min(line.indent, 8) * 15 + (line.quote ? 13 : 0)
        for (const spans of noteLines(line, width - indent)) {
          if (y < 66) {
            page = newPage(section.title)
            y = 634
          }
          let x = left + indent
          if (line.quote) {
            page.drawLine({
              start: { x: x - 7, y: y - 4 },
              end: { x: x - 7, y: y + 12 },
              color: muted,
            })
          }
          for (const span of spans) {
            const advance = textWidth(span.text, 11, !!span.bold, !!span.italic)
            drawLine(page, span.text, x, y, 11, !!span.bold, ink, !!span.italic)
            for (const offset of [span.underline ? -2 : null, span.strike ? 3 : null]) {
              if (offset == null) continue
              page.drawLine({
                start: { x, y: y + offset },
                end: { x: x + advance, y: y + offset },
                thickness: 0.65,
                color: ink,
              })
            }
            x += advance
          }
          y -= 16
        }
      }
      y -= 23
    }
  }

  function addReadingTable(
    title: string,
    device: { model: string; range: string; imei?: string },
    readings: { timestamp: number | null; measurement: string }[],
  ) {
    const pageTitle = `${title} - ${t('Reading history')}`
    const columns = [left + 10, left + 172]
    function startPage() {
      const page = newPage(pageTitle, ink, 23, neutralPanel, device)
      page.drawRectangle({ x: left, y: 602, width, height: 27, color: rgb(0.94, 0.95, 0.96) })
      write(page, t('Recorded (local time)'), columns[0]!, 612, 9, true)
      write(page, t('Measurement'), columns[1]!, 612, 9, true)
      return page
    }
    let page = startPage()
    let y = 587
    readings.forEach(({ timestamp, measurement }) => {
      const lines = wrap(measurement, 9, false, width - 184)
      for (let index = 0; index < lines.length; index++) {
        if (y < 66) {
          page = startPage()
          y = 587
        }
        if (index === 0) {
          write(page, timestamp == null ? '—' : fullTimestamp.format(timestamp), columns[0]!, y, 9)
        }
        write(page, lines[index]!, columns[1]!, y, 9)
        y -= 12
      }
      page.drawLine({
        start: { x: left, y: y + 5 },
        end: { x: left + width, y: y + 5 },
        color: border,
      })
      y -= 7
    })
  }

  function addReport<Reading extends { timestamp: number }>(
    report: MonitoringPdf<Reading>,
    details?: {
      range: string
      imei?: string
      uncharted: { timestamp: number | null; value: string; context: string }[]
    },
  ) {
    const { patient, chart, metrics, categories, history: historyColumns } = report
    const { readings } = patient
    const accent = pdfColor(report.accent)
    const panel = pdfColor(report.panel)

    function devicePage(title: string) {
      const page = newPage(
        title,
        accent,
        23,
        panel,
        details && { model: patient.device, ...details },
      )
      if (!details) {
        write(
          page,
          `${patient.name} · ${patient.id} · ${patient.device}`,
          left,
          647,
          10,
          false,
          muted,
        )
      }
      return page
    }

    const firstTime = readings[0]!.timestamp
    const lastTime = readings[readings.length - 1]!.timestamp
    const range = `${fullDate.format(firstTime)} – ${fullDate.format(lastTime)}`
    const overview = devicePage(report.title)
    if (!details) {
      write(overview, range, left, 630, 10, false, muted)
      write(overview, t('Mock patients and sample readings'), left, 612, 9, true, accent)
    }

    overview.drawRectangle({ x: left, y: 538, width, height: 54, color: panel })
    metrics.forEach(([label, value], index) => {
      const x = left + 12 + index * (width / metrics.length)
      write(overview, label, x, 576, 8, true, muted, width / metrics.length - 20)
      write(overview, value, x, 550, 17, true)
    })

    write(overview, chart.title, left, 508, 15, true)
    const axis = { left: left + 30, bottom: 300, width: width - 36, height: 178 }
    const ticks = [...chart.ticks]
    let lower = ticks[0]!
    let upper = ticks[ticks.length - 1]!
    for (const series of chart.series) {
      for (const reading of readings) {
        const value = series.value(reading)
        lower = Math.min(lower, value)
        upper = Math.max(upper, value)
      }
    }
    if (lower < ticks[0]!) ticks.unshift(lower)
    if (upper > ticks.at(-1)!) ticks.push(upper)
    const xAt = (time: number) =>
      firstTime === lastTime
        ? axis.left + axis.width / 2
        : axis.left + (axis.width * (time - firstTime)) / (lastTime - firstTime)
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
    for (const tick of ticks) {
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
    const firstLabel = shortDate.format(firstTime)
    const firstX =
      firstTime === lastTime ? xAt(firstTime) - textWidth(firstLabel, 8, false) / 2 : axis.left
    write(overview, firstLabel, firstX, 285, 8, false, muted)
    const finalLabel = shortDate.format(lastTime)
    if (finalLabel !== firstLabel)
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
      const prefix = band.range ? `${band.range} · ` : ''
      const textX = x + 10
      drawLine(overview, prefix, textX, 205, 9, false, muted)
      drawLine(overview, band.count, textX + textWidth(prefix, 9, false), 205, 9, true, ink)
    })

    write(overview, t('Reading insights'), left, 180, 15, true)
    let insightY = 158
    report.insights.forEach((line) => {
      const spans = line.flatMap<NoteSpan>(([label, value], index) => [
        { text: `${index ? ' · ' : ''}${label ? `${label}: ` : ''}` },
        { text: value, bold: label !== null },
      ])
      for (const row of noteLines({ spans, indent: 0, quote: false }, width, 10)) {
        let x = left
        for (const span of row) {
          drawLine(overview, span.text, x, insightY, 10, !!span.bold, ink)
          x += textWidth(span.text, 10, !!span.bold)
        }
        insightY -= 13
      }
      insightY -= 4
    })
    const history = [
      ...[...readings].reverse().map((reading) => ({
        timestamp: reading.timestamp,
        date: details ? fullTimestamp.format(reading.timestamp) : historyColumns.date(reading),
        value: historyColumns.value(reading),
        context: historyColumns.context(reading),
        band: report.category(reading),
      })),
      ...(details?.uncharted ?? []).map((reading) => ({
        ...reading,
        date: reading.timestamp == null ? '—' : fullTimestamp.format(reading.timestamp),
        band: { label: t('Not charted'), color: undefined },
      })),
    ].sort((a, b) => (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity))
    const firstRow = 587
    const rowHeight = 19
    const lastRow = 55
    const rowsPerPage = Math.floor((firstRow - lastRow) / rowHeight) + 1
    for (let offset = 0; offset < history.length; offset += rowsPerPage) {
      const page = devicePage(
        details ? `${report.title} - ${t('Reading history')}` : t('Reading history'),
      )
      const columns = [left + 10, left + 156, left + 286, left + 395]
      page.drawRectangle({ x: left, y: 602, width, height: 27, color: panel })
      const headings = [
        t('Recorded (local time)'),
        historyColumns.valueLabel,
        historyColumns.contextLabel,
        t('Range'),
      ]
      headings.forEach((heading, index) => write(page, heading, columns[index]!, 612, 9, true))
      history.slice(offset, offset + rowsPerPage).forEach((reading, index) => {
        const y = firstRow - index * rowHeight
        if (index % 2 === 0) {
          page.drawRectangle({
            x: left,
            y: y - 5,
            width,
            height: rowHeight,
            color: rgb(0.97, 0.98, 0.98),
          })
        }
        const { band } = reading
        write(page, reading.date, columns[0]!, y, 9)
        write(page, reading.value, columns[1]!, y, 9, true)
        write(page, reading.context, columns[2]!, y, 9)
        if (band.color) {
          page.drawCircle({ x: columns[3]! + 3, y: y + 3, size: 2.8, color: pdfColor(band.color) })
        }
        write(page, band.label, columns[3]! + 10, y, 9)
      })
    }
  }

  async function save(range: string, patient?: string) {
    const pages = pdf.getPages()
    pages.forEach((page, index) => {
      page.drawLine({ start: { x: left, y: 44 }, end: { x: left + width, y: 44 }, color: border })
      if (patient) write(page, patient, left, 33, 8, true, ink, width - 64)
      write(page, range, left, patient ? 20 : 29, 8, false, muted)
      const pageNumber = `${index + 1} / ${pages.length}`
      write(
        page,
        pageNumber,
        left + width - textWidth(pageNumber, 8, false) - 1,
        29,
        8,
        false,
        muted,
      )
    })
    await Promise.all(textImages)
    return pdf.save()
  }

  return { addOverview, addReport, addReadingTable, save }
}
