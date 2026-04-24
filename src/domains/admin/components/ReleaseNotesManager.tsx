import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Send, Archive, Trash2, X, Eye } from 'lucide-react'
import {
  getAllReleaseNotes,
  createReleaseNote,
  updateReleaseNote,
  publishReleaseNote,
  archiveReleaseNote,
  deleteReleaseNote,
} from '@/lib/firebase'
import type {
  ReleaseNote,
  ReleaseNoteStatus,
  CreateReleaseNoteInput,
} from '@/domains/whatsnew/types/releaseNote.types'
import { MarkdownContent } from '@/domains/whatsnew/components/MarkdownContent'

type StatusFilter = 'all' | ReleaseNoteStatus

const STATUS_LABEL: Record<ReleaseNoteStatus, string> = {
  draft: 'טיוטה',
  published: 'פורסם',
  archived: 'בארכיון',
}

const STATUS_BADGE_CLASS: Record<ReleaseNoteStatus, string> = {
  draft: 'bg-status-warning/15 text-status-warning',
  published: 'bg-status-success/15 text-status-success',
  archived: 'bg-on-surface-variant/15 text-on-surface-variant',
}

const formatDate = (value: unknown): string => {
  if (!value) return '—'
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' && value !== null && 'toDate' in value
        ? (value as { toDate: () => Date }).toDate()
        : null
  if (!date) return '—'
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface FormState {
  version: string
  titleHe: string
  bodyHe: string
  iconEmoji: string
}

const emptyForm: FormState = {
  version: '',
  titleHe: '',
  bodyHe: '',
  iconEmoji: '🎁',
}

export default function ReleaseNotesManager() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [editingNote, setEditingNote] = useState<ReleaseNote | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewNote, setPreviewNote] = useState<ReleaseNote | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ReleaseNote | null>(null)

  const { data: allNotes, isLoading } = useQuery<ReleaseNote[]>({
    queryKey: ['admin', 'releaseNotes', 'all'],
    queryFn: () => getAllReleaseNotes(),
    staleTime: 30_000,
  })

  const filteredNotes = useMemo(() => {
    if (!allNotes) return []
    if (filter === 'all') return allNotes
    return allNotes.filter((n) => n.status === filter)
  }, [allNotes, filter])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'releaseNotes'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'releaseNotes', 'draftsCount'] })
    queryClient.invalidateQueries({ queryKey: ['releaseNotes', 'published'] })
  }

  const createMut = useMutation({
    mutationFn: (input: CreateReleaseNoteInput) => createReleaseNote(input),
    onSuccess: () => {
      invalidate()
      setCreating(false)
    },
  })

  const updateMut = useMutation({
    mutationFn: (args: { id: string; updates: Partial<FormState> }) =>
      updateReleaseNote(args.id, args.updates),
    onSuccess: () => {
      invalidate()
      setEditingNote(null)
    },
  })

  const publishMut = useMutation({
    mutationFn: (id: string) => publishReleaseNote(id),
    onSuccess: invalidate,
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveReleaseNote(id),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteReleaseNote(id),
    onSuccess: () => {
      invalidate()
      setConfirmDelete(null)
    },
  })

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">📝 הודעות עדכון</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            ניהול "מה חדש" — טיוטות, פרסום וארכוב.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-primary-main text-on-primary font-semibold hover:bg-primary-main/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          צור חדש
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all', 'draft', 'published', 'archived'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-main text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {f === 'all' ? 'הכל' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-on-surface-variant">טוען…</div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">אין הודעות להצגה.</div>
      ) : (
        <div className="overflow-x-auto bg-surface-container rounded-2xl">
          <table className="min-w-full text-sm text-right">
            <thead className="border-b border-white/5 text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">אייקון</th>
                <th className="px-4 py-3 font-medium">כותרת</th>
                <th className="px-4 py-3 font-medium">גרסה</th>
                <th className="px-4 py-3 font-medium">נוצר</th>
                <th className="px-4 py-3 font-medium">פורסם</th>
                <th className="px-4 py-3 font-medium text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 h-6 rounded-full text-xs font-semibold ${
                        STATUS_BADGE_CLASS[note.status]
                      }`}
                    >
                      {STATUS_LABEL[note.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xl">{note.iconEmoji || '🎁'}</td>
                  <td className="px-4 py-3 text-on-surface font-medium max-w-xs truncate">
                    {note.titleHe}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant" dir="ltr">
                    {note.version || '—'}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {formatDate(note.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {formatDate(note.publishedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => setPreviewNote(note)}
                        className="p-2 text-on-surface-variant hover:text-primary-main transition-colors rounded-lg"
                        aria-label="תצוגה מקדימה"
                        title="תצוגה מקדימה"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNote(note)}
                        className="p-2 text-on-surface-variant hover:text-primary-main transition-colors rounded-lg"
                        aria-label="ערוך"
                        title="ערוך"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {note.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => publishMut.mutate(note.id)}
                          disabled={publishMut.isPending}
                          className="p-2 text-on-surface-variant hover:text-status-success transition-colors rounded-lg disabled:opacity-50"
                          aria-label="פרסם"
                          title="פרסם"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {note.status === 'published' && (
                        <button
                          type="button"
                          onClick={() => archiveMut.mutate(note.id)}
                          disabled={archiveMut.isPending}
                          className="p-2 text-on-surface-variant hover:text-status-warning transition-colors rounded-lg disabled:opacity-50"
                          aria-label="העבר לארכיון"
                          title="העבר לארכיון"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(note)}
                        className="p-2 text-on-surface-variant hover:text-status-error transition-colors rounded-lg"
                        aria-label="מחק"
                        title="מחק"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editingNote) && (
        <NoteEditorModal
          initial={editingNote}
          onClose={() => {
            setCreating(false)
            setEditingNote(null)
          }}
          onSubmit={(form) => {
            if (editingNote) {
              updateMut.mutate({ id: editingNote.id, updates: form })
            } else {
              createMut.mutate({
                version: form.version,
                changelogHash: '',
                titleHe: form.titleHe,
                bodyHe: form.bodyHe,
                iconEmoji: form.iconEmoji,
              })
            }
          }}
          isSaving={createMut.isPending || updateMut.isPending}
        />
      )}

      {previewNote && (
        <PreviewModal note={previewNote} onClose={() => setPreviewNote(null)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="מחיקת הודעה"
          message={`למחוק את "${confirmDelete.titleHe}"? פעולה זו אינה הפיכה.`}
          confirmLabel="מחק"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMut.mutate(confirmDelete.id)}
          isBusy={deleteMut.isPending}
        />
      )}
    </div>
  )
}

interface NoteEditorModalProps {
  initial: ReleaseNote | null
  onClose: () => void
  onSubmit: (form: FormState) => void
  isSaving: boolean
}

function NoteEditorModal({ initial, onClose, onSubmit, isSaving }: NoteEditorModalProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          version: initial.version,
          titleHe: initial.titleHe,
          bodyHe: initial.bodyHe,
          iconEmoji: initial.iconEmoji || '🎁',
        }
      : emptyForm
  )
  const [showPreview, setShowPreview] = useState(false)

  const isValid = form.titleHe.trim().length > 0 && form.titleHe.length <= 100 && form.bodyHe.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-surface-container rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-on-surface">
            {initial ? 'עריכת הודעה' : 'יצירת הודעה חדשה'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-on-surface-variant">אייקון</span>
              <input
                type="text"
                value={form.iconEmoji}
                onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })}
                maxLength={4}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-black/20 text-on-surface text-center text-xl"
              />
            </label>
            <label className="block">
              <span className="text-sm text-on-surface-variant">גרסה (אופציונלי)</span>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.10.115"
                dir="ltr"
                className="mt-1 w-full h-11 px-3 rounded-xl bg-black/20 text-on-surface"
              />
            </label>
          </div>

          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">כותרת (עברית)</span>
              <span className="text-xs text-on-surface-variant">
                {form.titleHe.length}/100
              </span>
            </div>
            <input
              type="text"
              value={form.titleHe}
              onChange={(e) => setForm({ ...form, titleHe: e.target.value.slice(0, 100) })}
              maxLength={100}
              className="mt-1 w-full h-11 px-3 rounded-xl bg-black/20 text-on-surface"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-on-surface-variant">תוכן (Markdown בסיסי)</span>
              <button
                type="button"
                onClick={() => setShowPreview((s) => !s)}
                className="text-xs text-primary-main hover:underline"
              >
                {showPreview ? 'עריכה' : 'תצוגה מקדימה'}
              </button>
            </div>
            {showPreview ? (
              <div className="min-h-[180px] p-3 rounded-xl bg-black/20">
                <MarkdownContent content={form.bodyHe || '_אין תוכן_'} />
              </div>
            ) : (
              <textarea
                value={form.bodyHe}
                onChange={(e) => setForm({ ...form, bodyHe: e.target.value })}
                rows={8}
                className="w-full p-3 rounded-xl bg-black/20 text-on-surface font-mono text-sm leading-relaxed"
                placeholder="**דגש**, *נטוי*, - רשימה, # כותרת"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-11 rounded-xl text-on-surface-variant hover:bg-white/5 transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={!isValid || isSaving}
            className="px-4 h-11 rounded-xl bg-primary-main text-on-primary font-semibold hover:bg-primary-main/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'שומר…' : initial ? 'שמור שינויים' : 'צור טיוטה'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PreviewModalProps {
  note: ReleaseNote
  onClose: () => void
}

function PreviewModal({ note, onClose }: PreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] bg-surface-container rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{note.iconEmoji || '🎁'}</span>
            <h2 className="text-base font-bold text-on-surface">{note.titleHe}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <MarkdownContent content={note.bodyHe} />
        </div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
  isBusy?: boolean
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
  isBusy,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm bg-surface-container rounded-3xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors -mt-2 -ml-2"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-11 rounded-xl text-on-surface-variant hover:bg-white/5 transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-4 h-11 rounded-xl text-on-primary font-semibold disabled:opacity-50 transition-colors ${
              danger
                ? 'bg-status-error hover:bg-status-error/90'
                : 'bg-primary-main hover:bg-primary-main/90'
            }`}
          >
            {isBusy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
