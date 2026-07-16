import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function EditSessionPanel({
  sessionId,
  initialTitle,
  initialAuthor,
  existingChapterCount,
  onSaved,
  onCancel,
}: {
  sessionId: string
  initialTitle: string
  initialAuthor: string
  existingChapterCount: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor)
  const [newChaptersText, setNewChaptersText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const newChapterLines = newChaptersText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('reading_sessions')
      .update({ title, author })
      .eq('id', sessionId)

    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }

    if (newChapterLines.length > 0) {
      const rows = newChapterLines.map((line, index) => ({
        session_id: sessionId,
        chapter_number: existingChapterCount + index + 1,
        chapter_title: line,
        position: existingChapterCount + index,
      }))
      const { error: chaptersError } = await supabase.from('session_chapters').insert(rows)
      if (chaptersError) {
        setSaving(false)
        setError(chaptersError.message)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded-xl border border-line bg-white p-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Title</span>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Author</span>
        <input
          type="text"
          required
          maxLength={200}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-soft">Add more chapters (one per line)</span>
        <textarea
          value={newChaptersText}
          onChange={(e) => setNewChaptersText(e.target.value)}
          rows={4}
          placeholder="Existing chapters can't be removed here — just add new ones to the end."
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-mono outline-none focus:border-plum"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-plum px-4 py-2 text-sm text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-plum"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
