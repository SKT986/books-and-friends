import { Link } from 'react-router-dom'

export interface SessionSummary {
  id: string
  title: string
  author: string
  visibility: 'public' | 'private'
  status: 'active' | 'archived'
  chapterCount: number
  memberCount: number
}

export function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <Link
      to={`/sessions/${session.id}`}
      className="block rounded-2xl border border-line bg-white p-5 shadow-sm hover:border-plum hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xl leading-snug">{session.title}</h3>
        {session.visibility === 'private' && (
          <span className="shrink-0 rounded-full bg-gold-light px-2.5 py-0.5 text-xs font-medium text-plum-dark">
            Private
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-soft">by {session.author}</p>
      <div className="mt-4 flex items-center gap-4 text-xs text-ink-soft">
        <span>{session.chapterCount} chapters</span>
        <span>&middot;</span>
        <span>
          {session.memberCount} {session.memberCount === 1 ? 'reader' : 'readers'}
        </span>
        {session.status === 'archived' && (
          <>
            <span>&middot;</span>
            <span>Archived</span>
          </>
        )}
      </div>
    </Link>
  )
}
