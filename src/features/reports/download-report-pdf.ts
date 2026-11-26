import { toast } from 'sonner'
import { translate as t } from '@/i18n'

export async function downloadReportPdf(
  filename: string,
  createPdf: (logo: ArrayBuffer) => Promise<Uint8Array>,
) {
  const toastId = toast.loading(t('Generating PDF…'))
  try {
    const logo = await fetch(`${import.meta.env.BASE_URL}icon-192.png`)
    if (!logo.ok) throw new Error('RPM logo unavailable')
    const bytes = await createPdf(await logo.arrayBuffer())
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
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
