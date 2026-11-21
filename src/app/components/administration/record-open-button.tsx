import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import './record-open-button.css'
export function RecordOpenButton({
  children,
  onOpen,
  disabled = false,
  className = '',
  label,
}: {
  children: ReactNode
  onOpen: () => void
  disabled?: boolean
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      className={`record-open-button ${className}`}
      onClick={onOpen}
      disabled={disabled}
      aria-label={label}
    >
      <span className="record-open-content">{children}</span>
      <ArrowUpRight size={13} className="record-open-arrow" aria-hidden="true" />
    </button>
  )
}
