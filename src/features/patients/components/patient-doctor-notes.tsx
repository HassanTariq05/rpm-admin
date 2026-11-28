import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useFormikContext } from 'formik'
import { Button, Dropdown } from '@heroui/react'
import { Check, Clock3, FileText, Loader2, MoreHorizontal, Save } from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'
import type { useProviderNoteActions, useProviderNotes } from '@/hooks/use-provider-notes'
import type { ProviderNote } from '@/services/patient-services/provider-note-services'
import { patientErrorMessage } from '../patients'
import { providerNoteLines, providerNoteTimestamp } from '../report-notes'

const PatientNotesEditor = lazy(() =>
  import('./patient-notes-editor').then((module) => ({ default: module.PatientNotesEditor })),
)

export type DoctorNotesValues = { notes: string; noteId: string | null }

export function PatientDoctorNotes({
  history,
  actions,
  canManage,
}: {
  actions: ReturnType<typeof useProviderNoteActions>
  history: ReturnType<typeof useProviderNotes>
  canManage: boolean
}) {
  useAppTranslation()
  const form = useFormikContext<DoctorNotesValues>()
  const { notes, noteId } = form.values
  const newDraft = useRef('')
  const [confirmDelete, setConfirmDelete] = useState<{ note: ProviderNote; index: number } | null>(
    null,
  )
  const [feedback, setFeedback] = useState<'saved' | 'deleted' | null>(null)
  const saving = actions.isPending && actions.variables?.type !== 'delete'
  const deleting = actions.isPending && actions.variables?.type === 'delete'
  const saved = feedback === 'saved'
  const deleted = feedback === 'deleted'
  const notesInHistory = history.data ?? []
  // Keep the action visible while the note disappears from the server-backed list.
  const visibleNotes =
    confirmDelete &&
    (deleting || deleted) &&
    !notesInHistory.some(({ id }) => id === confirmDelete.note.id)
      ? [
          ...notesInHistory.slice(0, confirmDelete.index),
          confirmDelete.note,
          ...notesInHistory.slice(confirmDelete.index),
        ]
      : notesInHistory

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => {
      setFeedback(null)
      if (feedback === 'deleted') setConfirmDelete(null)
    }, 1800)
    return () => window.clearTimeout(timeout)
  }, [feedback])
  const busy = form.isSubmitting || actions.isPending
  const canSave =
    providerNoteLines(notes).length > 0 &&
    (!noteId || notes !== history.data?.find((note) => note.id === noteId)?.body)

  function finishEditing() {
    form.resetForm({ values: { notes: newDraft.current, noteId: null } })
    newDraft.current = ''
  }

  function startEditing(note: ProviderNote) {
    if (!canManage || busy) return
    if (!noteId) newDraft.current = notes
    actions.reset()
    setFeedback(null)
    setConfirmDelete(null)
    form.resetForm({ values: { notes: note.body, noteId: note.id } })
  }

  async function save() {
    if (!canManage || busy || !canSave || saved) return
    if (deleted) setConfirmDelete(null)
    setFeedback(null)
    try {
      await actions.mutateAsync(
        noteId ? { type: 'update', id: noteId, body: notes } : { type: 'create', body: notes },
      )
      finishEditing()
      setFeedback('saved')
    } catch {
      // Keep the draft open for correction or retry.
    }
  }

  async function remove(id: string) {
    if (!canManage || busy || deleted || confirmDelete?.note.id !== id) return
    setFeedback(null)
    try {
      await actions.mutateAsync({ type: 'delete', id })
      if (noteId === id) finishEditing()
      setFeedback('deleted')
    } catch {
      // Leave the row available for retry.
    }
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <section
        aria-label={t("Doctor's Notes")}
        className="patient-report-notes min-w-0 rounded-xl border border-border bg-surface p-4"
      >
        <h3 className="mb-2 text-sm font-semibold text-foreground">{t("Doctor's Notes")}</h3>
        <Suspense
          fallback={
            <p role="status" className="text-sm text-muted">
              {t('Loading editor…')}
            </p>
          }
        >
          <PatientNotesEditor
            label="Doctor's Notes"
            showLabel={false}
            disabled={actions.isPending}
          />
        </Suspense>
        {canManage && (
          <div className="mt-3 flex flex-wrap justify-end gap-2" aria-live="polite">
            {noteId && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                isDisabled={busy}
                onPress={() => {
                  actions.reset()
                  finishEditing()
                }}
              >
                {t('Cancel edit')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="primary"
              isPending={saving}
              isDisabled={saved || busy || !canSave}
              onPress={() => void save()}
            >
              {saving ? (
                <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden="true" />
              ) : saved ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              {t(saving ? 'Saving…' : saved ? 'Saved' : noteId ? 'Save changes' : 'Save note')}
            </Button>
          </div>
        )}
        {actions.isError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {t(patientErrorMessage(actions.error))}
          </p>
        )}
      </section>
      <section
        aria-label={t('Note history')}
        className="flex min-h-0 min-w-0 flex-col rounded-xl border border-border bg-surface p-4 md:[contain:size]"
      >
        <h3 className="mb-2 text-sm font-semibold text-foreground">{t('Note history')}</h3>
        {history.isLoading && (
          <p role="status" className="text-sm text-muted">
            {t('Loading note history…')}
          </p>
        )}
        {history.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
            <p>{t('Could not load note history.')}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              isPending={history.isFetching}
              onPress={() => void history.refetch()}
            >
              {t('Try again')}
            </Button>
          </div>
        )}
        {history.isSuccess && !visibleNotes.length && (
          <div className="flex min-h-24 flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <span className="rounded-full bg-surface-muted p-2.5">
              <FileText size={20} className="admin-icon-violet" aria-hidden="true" />
            </span>
            <p>{t('No saved notes yet.')}</p>
          </div>
        )}
        {!!visibleNotes.length && (
          <ul
            aria-label={t('Note history')}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain max-md:max-h-64"
          >
            {visibleNotes.map((note, index) =>
              deleted && confirmDelete?.note.id === note.id ? (
                <li
                  key={note.id}
                  className="flex justify-end rounded-lg border border-border bg-surface-muted p-2"
                >
                  <div role="status">
                    <Button type="button" size="sm" variant="outline" isDisabled>
                      <Check size={15} className="admin-icon-teal" aria-hidden="true" />
                      {t('Deleted')}
                    </Button>
                  </div>
                </li>
              ) : (
                <li
                  key={note.id}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1.5 gap-y-1 rounded-lg border border-border bg-surface-muted p-2 xl:grid-cols-[fit-content(7rem)_minmax(0,1fr)_auto]"
                >
                  <time
                    dateTime={note.createdAt}
                    className="flex items-start gap-1.5 text-xs text-muted wrap-anywhere"
                  >
                    <Clock3 size={14} className="shrink-0" aria-hidden="true" />
                    {providerNoteTimestamp(note.createdAt)}
                  </time>
                  {canManage && (
                    <div className="col-start-2 row-start-1 xl:col-start-3">
                      <Dropdown>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={t('Note actions')}
                          isDisabled={busy}
                        >
                          <MoreHorizontal size={15} aria-hidden="true" />
                        </Button>
                        <Dropdown.Popover placement="bottom end">
                          <Dropdown.Menu aria-label={t('Note actions')}>
                            <Dropdown.Item id="edit" onAction={() => startEditing(note)}>
                              {t('Edit')}
                            </Dropdown.Item>
                            <Dropdown.Item
                              id="delete"
                              className="text-danger"
                              onAction={() => {
                                actions.reset()
                                setFeedback(null)
                                setConfirmDelete({ note, index })
                              }}
                            >
                              {t('Delete')}
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>
                  )}
                  <div className="col-span-full text-sm text-foreground wrap-anywhere xl:col-span-1 xl:col-start-2 xl:row-start-1">
                    {providerNoteLines(note.body).map(({ spans, quote, indent }, line) => (
                      <p
                        key={line}
                        className={quote ? 'italic text-muted' : undefined}
                        style={{ paddingInlineStart: `${indent}em` }}
                      >
                        {spans.map(({ text, bold, italic, underline, strike }, span) => (
                          <span
                            key={span}
                            className="whitespace-pre-wrap"
                            style={{
                              fontWeight: bold ? 700 : undefined,
                              fontStyle: italic ? 'italic' : undefined,
                              textDecoration:
                                [underline && 'underline', strike && 'line-through']
                                  .filter(Boolean)
                                  .join(' ') || undefined,
                            }}
                          >
                            {text}
                          </span>
                        ))}
                        {!spans.length && <br />}
                      </p>
                    ))}
                  </div>
                  {canManage && confirmDelete?.note.id === note.id && (
                    <div className="col-span-full flex flex-wrap items-center justify-end gap-2">
                      <span className="me-auto text-sm text-danger">
                        {t('Permanently delete this note?')}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        isDisabled={busy}
                        onPress={() => setConfirmDelete(null)}
                      >
                        {t('Cancel')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        isDisabled={busy}
                        isPending={deleting}
                        onPress={() => void remove(note.id)}
                      >
                        {deleting && (
                          <Loader2
                            size={15}
                            className="motion-safe:animate-spin"
                            aria-hidden="true"
                          />
                        )}
                        {t(deleting ? 'Deleting…' : 'Delete')}
                      </Button>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
