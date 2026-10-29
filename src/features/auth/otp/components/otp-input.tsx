import { useRef } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  hasError: boolean
}

export const OtpInput = ({ value, onChange, onBlur, hasError }: OtpInputProps) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '')

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus()
  }

  const handleChange = (index: number, inputValue: string) => {
    const digit = inputValue.replace(/\D/g, '').slice(-1)
    const nextDigits = [...digits]

    nextDigits[index] = digit
    onChange(nextDigits.join(''))

    if (digit && index < 5) {
      focusInput(index + 1)
    }
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        const nextDigits = [...digits]
        nextDigits[index] = ''
        onChange(nextDigits.join(''))
      } else if (index > 0) {
        focusInput(index - 1)
        const nextDigits = [...digits]
        nextDigits[index - 1] = ''
        onChange(nextDigits.join(''))
      }
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1)
    }

    if (event.key === 'ArrowRight' && index < 5) {
      focusInput(index + 1)
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()

    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

    onChange(pastedDigits)
    focusInput(Math.min(pastedDigits.length, 5))
  }

  return (
    <div
      className="flex justify-between gap-2 sm:gap-3"
      role="group"
      aria-label="Six-digit verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={hasError}
          value={digit}
          maxLength={1}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onBlur={onBlur}
          onFocus={(event) => event.currentTarget.select()}
          className={`rpm-otp-input h-12 min-w-0 flex-1 rounded-xl border bg-input text-center text-xl font-semibold text-foreground outline-none transition-colors sm:h-14 ${
            hasError
              ? 'border-danger focus:border-danger focus:ring-4 focus:ring-danger/10'
              : 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'
          }`}
        />
      ))}
    </div>
  )
}
