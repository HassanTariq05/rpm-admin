export interface NoteSpan {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}

export interface NoteLine {
  spans: NoteSpan[]
  indent: number
  quote: boolean
}

const marks: Partial<Record<string, keyof Omit<NoteSpan, 'text'>>> = {
  STRONG: 'bold',
  B: 'bold',
  EM: 'italic',
  I: 'italic',
  U: 'underline',
  S: 'strike',
  DEL: 'strike',
}

export function reportNotes(html: string): NoteLine[] {
  const template = document.createElement('template')
  template.innerHTML = html
  const lines: NoteLine[] = []
  let spans: NoteSpan[] = []

  function endLine(indent: number, quote: boolean, force = false) {
    if (spans.length || force) lines.push({ spans, indent, quote })
    spans = []
  }

  function visit(node: Node, style: Omit<NoteSpan, 'text'>, indent: number, quote: boolean) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) spans.push({ text: node.textContent, ...style })
      return
    }
    if (!(node instanceof Element)) return
    const tag = node.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE') return
    if (tag === 'BR') {
      endLine(indent, quote, true)
      return
    }
    if (tag === 'UL' || tag === 'OL') {
      endLine(indent, quote)
      Array.from(node.children).forEach((item, index) => {
        spans.push({ text: tag === 'OL' ? `${index + 1}. ` : '• ' })
        item.childNodes.forEach((child) => visit(child, style, indent + 1, quote))
        endLine(indent + 1, quote)
      })
      return
    }
    const mark = marks[tag]
    const nextStyle = mark ? { ...style, [mark]: true } : style
    node.childNodes.forEach((child) =>
      visit(child, nextStyle, indent, quote || tag === 'BLOCKQUOTE'),
    )
    if (tag === 'P' || tag === 'BLOCKQUOTE')
      endLine(indent, quote || tag === 'BLOCKQUOTE', tag === 'P')
  }

  template.content.childNodes.forEach((node) => visit(node, {}, 0, false))
  endLine(0, false)
  while (lines.length && !lines.at(-1)!.spans.some(({ text }) => text.trim())) lines.pop()
  return lines
}
