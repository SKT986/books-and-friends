import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ChapterInfo {
  id: string
  chapterNumber: number
  chapterTitle: string | null
}

export function ChapterProgressList({
  sessionId,
  chapters,
  completedChapterIds,
  disabled,
}: {
  sessionId: string
  chapters: ChapterInfo[]
  completedChapterIds: Set<string>
  disabled?: boolean
}) {
  const [openNoteFor, setOpenNoteFor] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const markComplete = async (chapterId: string, note: string) => {
    setBusyId(chapterId)
    await supabase.rpc('toggle_chapter_complete', {
      p_session_id: sessionId,
      p_chapter_id: chapterId,
      p_completed: true,
      p_note: note.trim() || null,
    })
    setBusyId(null)
    setOpenNoteFor(null)
    setNoteDraft('')
  }

  const undo = async (chapterId: string) => {
    setBusyId(chapterId)
    await supabase.rpc('toggle_chapter_complete', {
      p_session_id: sessionId,
      p_chapter_id: chapterId,
      p_completed: false,
    })
    setBusyId(null)
  }

  if (chapters.length === 0) {
    return <p className="text-sm text-ink-soft">No chapters yet.</p>
  }

  return (
    <ol className="flex flex-col divide-y divide-line">
      {chapters.map((chapter) => {
        const done = completedChapterIds.has(chapter.id)
        return (
          <li key={chapter.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={disabled || busyId === chapter.id}
                onClick={() => (done ? undo(chapter.id) : setOpenNoteFor(chapter.id))}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors disabled:opacity-40 ${
                  done ? 'border-plum bg-plum text-white' : 'border-line text-transparent hover:border-plum'
                }`}
                aria-label={done ? 'Mark as unread' : 'Mark as read'}
              >
                ✓
              </button>
              <span className={`text-sm ${done ? 'text-ink-soft line-through' : 'text-ink'}`}>
                {chapter.chapterNumber}. {chapter.chapterTitle}
              </span>
            </div>

            {openNoteFor === chapter.id && (
              <div className="mt-2 ml-9 flex flex-col gap-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Share a quick thought (optional)"
                  rows={2}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-plum"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => markComplete(chapter.id, noteDraft)}
                    className="rounded-full bg-plum px-3 py-1 text-xs text-white hover:bg-plum-dark transition-colors"
                  >
                    Mark complete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenNoteFor(null)
                      setNoteDraft('')
                    }}
                    className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-plum"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
