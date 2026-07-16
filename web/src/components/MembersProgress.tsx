export interface MemberInfo {
  userId: string
  role: 'creator' | 'member'
  displayName: string
  username: string
  avatarUrl: string | null
  completedCount: number
}

export function MembersProgress({
  members,
  totalChapters,
  canManage = false,
  onRemove,
}: {
  members: MemberInfo[]
  totalChapters: number
  canManage?: boolean
  onRemove?: (userId: string) => void
}) {
  if (members.length === 0) {
    return <p className="text-sm text-ink-soft">No readers yet.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {members.map((m) => {
        const pct = totalChapters === 0 ? 0 : Math.round((m.completedCount / totalChapters) * 100)
        const name = m.displayName || m.username
        return (
          <li key={m.userId} className="flex items-center gap-3">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} className="h-8 w-8 shrink-0 rounded-full object-cover" alt="" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum-light text-xs font-medium text-plum-dark">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-ink">
                  {name}
                  {m.role === 'creator' && <span className="ml-1.5 text-xs text-gold">host</span>}
                </span>
                <span className="shrink-0 text-xs text-ink-soft">
                  {m.completedCount}/{totalChapters}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-paper-dim">
                <div className="h-1.5 rounded-full bg-plum transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {canManage && m.role !== 'creator' && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(m.userId)}
                className="shrink-0 text-xs text-ink-soft hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
