import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SessionCard, type SessionSummary } from '../components/SessionCard'

type RawSessionRow = {
  id: string
  title: string
  author: string
  visibility: 'public' | 'private'
  status: 'active' | 'archived'
  session_chapters: { count: number }[]
  session_members: { count: number }[]
}

function toSummary(row: RawSessionRow): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    visibility: row.visibility,
    status: row.status,
    chapterCount: row.session_chapters[0]?.count ?? 0,
    memberCount: row.session_members[0]?.count ?? 0,
  }
}

export function DiscoverPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'discover' | 'mine'>('discover')
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      if (tab === 'discover') {
        let query = supabase
          .from('reading_sessions')
          .select(
            'id, title, author, visibility, status, session_chapters!session_chapters_session_id_fkey(count), session_members(count)',
          )
          .eq('visibility', 'public')
          .eq('status', 'active')
        if (search) {
          query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
        }
        const { data } = await query.order('created_at', { ascending: false })
        if (!cancelled) setSessions(((data as RawSessionRow[] | null) ?? []).map(toSummary))
      } else if (user) {
        const { data: memberRows } = await supabase
          .from('session_members')
          .select('session_id')
          .eq('user_id', user.id)
        const ids = (memberRows ?? []).map((r) => r.session_id)
        if (ids.length === 0) {
          if (!cancelled) setSessions([])
        } else {
          let query = supabase
            .from('reading_sessions')
            .select(
              'id, title, author, visibility, status, session_chapters!session_chapters_session_id_fkey(count), session_members(count)',
            )
            .in('id', ids)
          if (search) {
            query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)
          }
          const { data } = await query.order('created_at', { ascending: false })
          if (!cancelled) setSessions(((data as RawSessionRow[] | null) ?? []).map(toSummary))
        }
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tab, user, search])

  const handleJoinByCode = async (e: FormEvent) => {
    e.preventDefault()
    setJoinError(null)
    setJoining(true)
    const { data, error } = await supabase.rpc('join_session_by_code', { p_code: joinCode.trim() })
    setJoining(false)
    if (error) {
      setJoinError(error.message)
      return
    }
    navigate(`/sessions/${data}`)
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-full border border-line p-1 text-sm">
          <button
            onClick={() => setTab('discover')}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              tab === 'discover' ? 'bg-plum text-white' : 'text-ink-soft'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              tab === 'mine' ? 'bg-plum text-white' : 'text-ink-soft'
            }`}
          >
            My sessions
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title or author…"
            className="w-48 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm outline-none focus:border-plum"
          />
          <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Have an invite code?"
              className="w-44 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm outline-none focus:border-plum"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-soft hover:border-plum hover:text-plum transition-colors disabled:opacity-50"
            >
              Join
            </button>
          </form>
        </div>
      </div>
      {joinError && <p className="mt-2 text-sm text-red-600">{joinError}</p>}

      <div className="mt-6">
        {loading ? (
          <p className="text-ink-soft">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
            {search
              ? `No sessions match "${search}".`
              : tab === 'discover'
                ? 'No public sessions yet — be the first to start one.'
                : "You haven't joined any sessions yet."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
