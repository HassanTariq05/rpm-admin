import { toast } from 'sonner'
import { translate as t } from '@/i18n'

type CreatePdf = (logo: ArrayBuffer) => Promise<Uint8Array>

async function reportPdfUrl(createPdf: CreatePdf) {
  const logo = await fetch(`${import.meta.env.BASE_URL}icon-192.png`)
  if (!logo.ok) throw new Error('RPM logo unavailable')
  const bytes = await createPdf(await logo.arrayBuffer())
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
}

export async function downloadReportPdf(filename: string, createPdf: CreatePdf) {
  const toastId = toast.loading(t('Generating PDF…'))
  try {
    const url = await reportPdfUrl(createPdf)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(t('PDF downloaded'), { id: toastId })
  } catch {
    toast.error(t('Could not generate the PDF. Please try again.'), { id: toastId })
  }
}

export async function printReportPdf(createPdf: CreatePdf) {
  // Open during the click so browsers can associate the preview with the user gesture.
  const preview = window.open('', '_blank')
  if (!preview) {
    toast.error(t('Allow pop-ups to open the print preview.'))
    return
  }

  preview.opener = null
  const doc = preview.document
  doc.title = t('Print Report')
  doc.body.textContent = t('Generating PDF…')

  try {
    const url = await reportPdfUrl(createPdf)
    if (preview.closed) {
      URL.revokeObjectURL(url)
      return
    }
    preview.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true })

    const openPdf = doc.createElement('a')
    openPdf.href = url
    openPdf.target = '_blank'
    openPdf.rel = 'noopener'
    openPdf.textContent = t('Open PDF')
    openPdf.style.cssText = 'display:block;padding:8px 12px;color:inherit'

    const frame = doc.createElement('iframe')
    frame.title = t('Print Report')
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0'
    frame.addEventListener(
      'load',
      () => {
        try {
          frame.contentWindow?.focus()
          frame.contentWindow?.print()
        } catch {
          // The built-in viewer and Open PDF link are available if scripted printing is blocked.
        }
      },
      { once: true },
    )
    frame.src = url
    doc.body.style.cssText =
      'margin:0;height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr);font:14px system-ui;color-scheme:light dark'
    doc.body.replaceChildren(openPdf, frame)
  } catch {
    preview.close()
    toast.error(t('Could not generate the PDF. Please try again.'))
  }
}
