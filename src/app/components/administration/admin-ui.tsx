import './admin-editor.css'
import { useState, type ReactNode } from 'react'
import {
  Button,
  Checkbox,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
} from '@heroui/react'
import { useField } from 'formik'
import { Activity, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { getInitials } from '@/lib/initials'
import { apiErrorMessage } from '@/lib/administration'
import { cn } from '@/lib/cn'

export type Choice = { id: string; label: string }

export function ChoiceField({
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  placeholder = 'Select an option',
  onBlur,
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Choice[]
  error?: string
  disabled?: boolean
  placeholder?: string
  onBlur?: () => void
  icon?: ReactNode
}) {
  return (
    <Select
      fullWidth
      value={value || null}
      onChange={(key) => onChange(String(key ?? ''))}
      onBlur={onBlur}
      isInvalid={!!error}
      isDisabled={disabled}
      placeholder={placeholder}
    >
      <Label className="text-xs font-semibold">{label}</Label>
      <Select.Trigger className="w-full">
        <span className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="shrink-0 text-muted" aria-hidden="true">
              {icon}
            </span>
          )}
          <Select.Value className="min-w-0 truncate" />
        </span>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={options} aria-label={label}>
          {(option) => (
            <ListBox.Item id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
      {error && <FieldError>{error}</FieldError>}
    </Select>
  )
}

export function FormTextField({
  name,
  label,
  type = 'text',
  multiline = false,
  disabled = false,
  placeholder,
  icon,
  passwordToggle = false,
}: {
  name: string
  label: string
  type?: string
  multiline?: boolean
  disabled?: boolean
  placeholder?: string
  icon?: ReactNode
  passwordToggle?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [field, meta, helpers] = useField<string>(name)
  const error = meta.touched ? meta.error : undefined
  return (
    <TextField
      name={name}
      type={passwordToggle && visible ? 'text' : type}
      value={field.value}
      onChange={(value) => void helpers.setValue(value)}
      onBlur={field.onBlur}
      isInvalid={!!error}
      isDisabled={disabled}
    >
      <Label className="text-xs font-semibold">{label}</Label>
      {multiline ? (
        <div className="relative w-full">
          {icon && (
            <span
              className="pointer-events-none absolute top-3 left-3 z-10 text-muted"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <TextArea className={cn('w-full min-h-24', icon && 'pl-10')} placeholder={placeholder} />
        </div>
      ) : (
        <div className="relative w-full">
          {icon && (
            <span
              className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <Input
            className={cn('w-full', icon && 'pl-10', passwordToggle && 'pr-11')}
            placeholder={placeholder}
            autoComplete={type === 'password' ? 'new-password' : 'off'}
          />
          {passwordToggle && (
            <button
              type="button"
              aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
              aria-pressed={visible}
              disabled={disabled}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
    </TextField>
  )
}

export function FormStatusField({ name = 'status' }: { name?: string }) {
  const [field, , helpers] = useField<string>(name)
  const active = field.value === 'active'
  return (
    <div className="admin-status-card flex min-h-16 items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
      <span className="flex items-center gap-2 text-foreground">
        <Activity size={17} className="admin-icon-teal" aria-hidden="true" />
        <span>
          <span id={`${name}-label`} className="block text-xs font-semibold">
            Status
          </span>
          <span className="text-xs text-muted">{active ? 'Active' : 'Inactive'}</span>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-labelledby={`${name}-label`}
        aria-checked={active}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? 'bg-success' : 'bg-muted'}`}
        onClick={() => void helpers.setValue(active ? 'inactive' : 'active')}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

export function FormChoiceField({
  name,
  label,
  options,
  disabled,
  placeholder,
  onChange,
  icon,
}: {
  name: string
  label: string
  options: Choice[]
  disabled?: boolean
  placeholder?: string
  onChange?: (value: string) => void
  icon?: ReactNode
}) {
  const [field, meta, helpers] = useField<string>(name)
  return (
    <ChoiceField
      label={label}
      icon={icon}
      options={options}
      value={field.value}
      error={meta.touched ? meta.error : undefined}
      disabled={disabled}
      placeholder={placeholder}
      onBlur={() => void helpers.setTouched(true)}
      onChange={(value) => {
        void helpers.setValue(value)
        onChange?.(value)
      }}
    />
  )
}

export function SubmitButton({
  pending,
  children,
  ...props
}: {
  pending: boolean
  children: ReactNode
  form?: string
  disabled?: boolean
  onPress?: () => void
  type?: 'submit' | 'button'
}) {
  return (
    <Button
      variant="primary"
      type={props.type ?? 'submit'}
      form={props.form}
      onPress={props.onPress}
      isDisabled={pending || props.disabled}
      aria-busy={pending}
    >
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
      {pending ? 'Saving…' : children}
    </Button>
  )
}

export function FormModal({
  title,
  description,
  open,
  onClose,
  pending,
  children,
  footer,
  className,
  dialogClassName,
  scroll = 'inside',
  headerIcon,
  cancelLabel = 'Cancel',
}: {
  title: string
  description: string
  open: boolean
  onClose: () => void
  pending: boolean
  children: ReactNode
  footer: ReactNode
  className?: string
  dialogClassName?: string
  scroll?: 'inside' | 'outside'
  headerIcon?: ReactNode
  cancelLabel?: string
}) {
  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !pending) onClose()
      }}
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
    >
      <Modal.Container
        className={cn('min-h-[90vh]', className)}
        size="lg"
        placement="center"
        scroll={scroll}
      >
        <Modal.Dialog className={cn('bg-surface text-foreground', dialogClassName)}>
          <Modal.Header>
            {headerIcon ? (
              <div className="flex items-center gap-4">
                <span className="modal-header-icon" aria-hidden="true">
                  {headerIcon}
                </span>
                <div className="min-w-0">
                  <Modal.Heading>{title}</Modal.Heading>
                  <p className="mt-1 text-sm text-muted">{description}</p>
                </div>
              </div>
            ) : (
              <>
                <Modal.Heading>{title}</Modal.Heading>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </>
            )}
          </Modal.Header>
          {!pending && <Modal.CloseTrigger />}
          <Modal.Body className="space-y-4">{children}</Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onClose} isDisabled={pending}>
              {cancelLabel}
            </Button>
            {footer}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

export function RequestState({
  pending,
  error,
  retry,
  children,
}: {
  pending: boolean
  error?: unknown
  retry: () => void
  children: ReactNode
}) {
  if (pending)
    return (
      <div
        role="status"
        className="panel flex min-h-64 items-center justify-center gap-3 text-sm text-muted"
      >
        <Loader2 size={20} className="animate-spin" />
        Loading records…
      </div>
    )
  if (error)
    return (
      <div
        role="alert"
        className="panel flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <AlertCircle size={24} className="text-danger" />
        <p className="text-sm">Unable to load records.</p>
        <p className="text-xs text-muted">{apiErrorMessage(error)}</p>
        <Button variant="outline" onPress={retry}>
          Try again
        </Button>
      </div>
    )
  return children
}

export function RecordName({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div className="flex min-w-40 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-avatar-bg text-[11px] font-bold text-avatar-text">
        {getInitials(name)}
      </span>
      <span>
        <span className="block text-xs font-semibold">{name}</span>
        {subtitle && <span className="mt-0.5 block text-[11px] text-muted">{subtitle}</span>}
      </span>
    </div>
  )
}

export function StatusPill({ status }: { status?: string }) {
  const active = status?.toLowerCase() === 'active'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${active ? 'bg-success-bg text-success' : 'bg-surface-muted text-muted'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-success' : 'bg-muted'}`} />
      {status || 'Unknown'}
    </span>
  )
}

export function CheckField({
  label,
  selected,
  indeterminate,
  disabled,
  onChange,
}: {
  label: string
  selected: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <Checkbox
      isSelected={selected}
      isIndeterminate={indeterminate}
      isDisabled={disabled}
      onChange={onChange}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label className="text-xs">{label}</Label>
      </Checkbox.Content>
    </Checkbox>
  )
}

export function ConfirmDelete({
  name,
  entity,
  pending,
  onClose,
  onConfirm,
  error,
}: {
  name: string
  entity: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
  error?: unknown
}) {
  const [confirmation, setConfirmation] = useState('')
  return (
    <FormModal
      open
      dialogClassName="admin-editor-modal"
      headerIcon={<AlertCircle size={25} />}
      scroll="outside"
      title={`Delete ${entity}`}
      description={`Permanently delete ${name}? This action cannot be undone.`}
      pending={pending}
      onClose={onClose}
      footer={
        <Button variant="danger" isDisabled={pending || confirmation !== name} onPress={onConfirm}>
          {pending && <Loader2 size={15} className="animate-spin" />}Delete {entity}
        </Button>
      }
    >
      <TextField value={confirmation} onChange={setConfirmation}>
        <Label>Type {name} to confirm</Label>
        <Input autoComplete="off" className="w-full" placeholder={name} />
      </TextField>
      {!!error && (
        <p role="alert" className="text-sm text-danger">
          {apiErrorMessage(error)}
        </p>
      )}
    </FormModal>
  )
}
