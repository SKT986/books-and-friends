import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Visibility } from '../types/database'

export function CreateSessionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [chapterText, setChapterText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const chapterLines = chapterText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (chapterLines.length === 0) {
      setError('Add at least one chapter.')
      return
    }
    setError(null)
    setSubmitting(true)

    const { data: session, error: sessionError } = await supabase
      .from('reading_sessions')
      .insert({ title, author, visibility, creator_id: user.id })
      .select()
      .single()

    if (sessionError || !session) {
      setSubmitting(false)
      setError(sessionError?.message ?? 'Could not create session.')
      return
    }

    const chapterRows = chapterLines.map((line, index) => ({
      session_id: session.id,
      chapter_number: index + 1,
      chapter_title: line,
      position: index,
    }))

    const { error: chaptersError } = await supabase.from('session_chapters').insert(chapterRows)

    setSubmitting(false)
    if (chaptersError) {
      setError(chaptersError.message)
      return
    }

    navigate(`/sessions/${session.id}`)
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <h1 className="text-3xl">Start a reading session</h1>
      <p className="mt-1 text-ink-soft">Tell us what you're reading and lay out the chapters.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Title</span>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
            placeholder="The Night Circus"
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
            placeholder="Erin Morgenstern"
          />
        </label>

        <fieldset className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Who can join?</span>
          <div className="flex rounded-full border border-line p-1 w-fit">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                visibility === 'public' ? 'bg-plum text-white' : 'text-ink-soft'
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                visibility === 'private' ? 'bg-plum text-white' : 'text-ink-soft'
              }`}
            >
              Private (invite only)
            </button>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Chapters (one per line)</span>
          <textarea
            required
            value={chapterText}
            onChange={(e) => setChapterText(e.target.value)}
            rows={8}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum font-mono text-sm"
            placeholder={'The Circus Arrives\nAlways/Never\nA Man of Puzzles'}
          />
          <span className="text-xs text-ink-soft">
            {chapterLines.length} chapter{chapterLines.length === 1 ? '' : 's'}
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-full bg-plum py-2.5 text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create session'}
        </button>
      </form>
    </div>
  )
}
