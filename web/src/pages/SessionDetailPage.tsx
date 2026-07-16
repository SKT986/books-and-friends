import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { ReadingSession } from '../types/database'
import { ChapterProgressList, type ChapterInfo } from '../components/ChapterProgressList'
import { MembersProgress, type MemberInfo } from '../components/MembersProgress'
import { PostItem, type PostInfo } from '../components/PostItem'
import { EditSessionPanel } from '../components/EditSessionPanel'

type ProfileEmbed = { username: string; display_name: string | null; avatar_url: string | null } | null

const POSTS_PAGE_SIZE = 20

const POST_SELECT =
  'id, user_id, post_type, body, chapter_id, created_at, updated_at, profiles(username, display_name, avatar_url), reactions(id, user_id, emoji)'

type RawPostRow = {
  id: string
  user_id: string
  post_type: 'comment' | 'progress'
  body: string | null
  chapter_id: string | null
  created_at: string
  updated_at: string | null
  profiles: ProfileEmbed
  reactions: { id: string; user_id: string; emoji: string }[]
}

function mapPostRows(rows: RawPostRow[]): PostInfo[] {
  return rows.map((p) => ({
    id: p.id,
    userId: p.user_id,
    postType: p.post_type,
    body: p.body,
    chapterId: p.chapter_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    author: {
      displayName: p.profiles?.display_name ?? null,
      username: p.profiles?.username ?? 'member',
      avatarUrl: p.profiles?.avatar_url ?? null,
    },
    reactions: p.reactions.map((r) => ({ id: r.id, userId: r.user_id, emoji: r.emoji })),
  }))
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState<ReadingSession | null | undefined>(undefined)
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [progressByUser, setProgressByUser] = useState<Record<string, Set<string>>>({})
  const [posts, setPosts] = useState<PostInfo[]>([])
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [editingSession, setEditingSession] = useState(false)

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.from('reading_sessions').select('*').eq('id', sessionId).maybeSingle()
    setSession(data ?? null)
  }, [sessionId])

  const loadChapters = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase
      .from('session_chapters')
      .select('id, chapter_number, chapter_title, position')
      .eq('session_id', sessionId)
      .order('position')
    setChapters(
      (data ?? []).map((c) => ({ id: c.id, chapterNumber: c.chapter_number, chapterTitle: c.chapter_title })),
    )
  }, [sessionId])

  const loadMembersAndProgress = useCallback(async () => {
    if (!sessionId) return
    const [{ data: memberRows }, { data: progressRows }] = await Promise.all([
      supabase
        .from('session_members')
        .select('user_id, role, profiles(username, display_name, avatar_url)')
        .eq('session_id', sessionId),
      supabase.from('member_progress').select('user_id, chapter_id').eq('session_id', sessionId),
    ])

    const byUser: Record<string, Set<string>> = {}
    for (const row of progressRows ?? []) {
      ;(byUser[row.user_id] ??= new Set()).add(row.chapter_id)
    }
    setProgressByUser(byUser)

    const rows = (memberRows ?? []) as unknown as {
      user_id: string
      role: 'creator' | 'member'
      profiles: ProfileEmbed
    }[]

    setMembers(
      rows.map((m) => ({
        userId: m.user_id,
        role: m.role,
        displayName: m.profiles?.display_name ?? '',
        username: m.profiles?.username ?? 'member',
        avatarUrl: m.profiles?.avatar_url ?? null,
        completedCount: byUser[m.user_id]?.size ?? 0,
      })),
    )
  }, [sessionId])

  const loadPosts = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase
      .from('thread_posts')
      .select(POST_SELECT)
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(POSTS_PAGE_SIZE)

    const rows = (data ?? []) as unknown as RawPostRow[]
    setPosts(mapPostRows(rows))
    setHasMorePosts(rows.length === POSTS_PAGE_SIZE)
  }, [sessionId])

  const loadOlderPosts = async () => {
    if (!sessionId || posts.length === 0) return
    setLoadingMorePosts(true)
    const oldest = posts[posts.length - 1].createdAt
    const { data } = await supabase
      .from('thread_posts')
      .select(POST_SELECT)
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(POSTS_PAGE_SIZE)

    const rows = (data ?? []) as unknown as RawPostRow[]
    setPosts((prev) => [...prev, ...mapPostRows(rows)])
    setHasMorePosts(rows.length === POSTS_PAGE_SIZE)
    setLoadingMorePosts(false)
  }

  useEffect(() => {
    loadSession()
    loadChapters()
    loadMembersAndProgress()
    loadPosts()
  }, [loadSession, loadChapters, loadMembersAndProgress, loadPosts])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thread_posts', filter: `session_id=eq.${sessionId}` },
        () => loadPosts(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadPosts())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_members', filter: `session_id=eq.${sessionId}` },
        () => loadMembersAndProgress(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_progress', filter: `session_id=eq.${sessionId}` },
        () => loadMembersAndProgress(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, loadPosts, loadMembersAndProgress])

  const isMember = !!user && members.some((m) => m.userId === user.id)
  const isCreator = !!user && session?.creator_id === user.id
  const isActive = session?.status === 'active'

  const handleJoinPublic = async () => {
    if (!user || !sessionId) return
    setJoining(true)
    await supabase.from('session_members').insert({ session_id: sessionId, user_id: user.id, role: 'member' })
    await Promise.all([loadMembersAndProgress(), loadPosts()])
    setJoining(false)
  }

  const handleLeave = async () => {
    if (!user || !sessionId) return
    if (!window.confirm('Leave this session? You can rejoin later if it stays public or you keep the invite link.')) {
      return
    }
    await supabase.from('session_members').delete().eq('session_id', sessionId).eq('user_id', user.id)
    navigate('/discover')
  }

  const handleRemoveMember = async (memberUserId: string) => {
    if (!sessionId) return
    if (!window.confirm('Remove this reader from the session?')) return
    await supabase.from('session_members').delete().eq('session_id', sessionId).eq('user_id', memberUserId)
    await loadMembersAndProgress()
  }

  const handleToggleArchive = async () => {
    if (!sessionId || !session) return
    const nextStatus = session.status === 'active' ? 'archived' : 'active'
    if (
      nextStatus === 'archived' &&
      !window.confirm('Archive this session? It becomes fully read-only for everyone until reactivated.')
    ) {
      return
    }
    setArchiving(true)
    await supabase.from('reading_sessions').update({ status: nextStatus }).eq('id', sessionId)
    await loadSession()
    setArchiving(false)
  }

  const handlePostComment = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !sessionId || !commentDraft.trim()) return
    setPosting(true)
    await supabase.from('thread_posts').insert({
      session_id: sessionId,
      user_id: user.id,
      post_type: 'comment',
      body: commentDraft.trim(),
    })
    setPosting(false)
    setCommentDraft('')
    loadPosts()
  }

  const handleRegenerateCode = async () => {
    if (!sessionId) return
    setRegenerating(true)
    await supabase.rpc('regenerate_join_code', { p_session_id: sessionId })
    await loadSession()
    setRegenerating(false)
  }

  if (session === undefined) {
    return <div className="flex flex-1 items-center justify-center py-24 text-ink-soft">Loading…</div>
  }

  if (session === null) {
    return (
      <div className="mx-auto max-w-md flex-1 px-6 py-24 text-center">
        <h1 className="text-2xl">Session not found</h1>
        <p className="mt-2 text-ink-soft">
          It may be private, archived, or the link is incorrect. Ask the host for a fresh invite.
        </p>
      </div>
    )
  }

  const chapterLabel = (chapterId: string | null) =>
    chapterId ? chapters.find((c) => c.id === chapterId)?.chapterTitle ?? undefined : undefined

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{session.title}</h1>
          <p className="mt-1 text-ink-soft">by {session.author}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {session.visibility === 'private' && (
            <span className="rounded-full bg-gold-light px-2.5 py-1 font-medium text-plum-dark">Private</span>
          )}
          {session.status === 'archived' && (
            <span className="rounded-full bg-paper-dim px-2.5 py-1 font-medium text-ink-soft">Archived</span>
          )}
        </div>
      </div>

      {isCreator && (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => setEditingSession((v) => !v)}
            className="text-plum hover:underline"
          >
            {editingSession ? 'Close editor' : 'Edit session'}
          </button>
          <button
            type="button"
            onClick={handleToggleArchive}
            disabled={archiving}
            className="text-ink-soft hover:text-plum transition-colors disabled:opacity-50"
          >
            {archiving ? 'Working…' : session.status === 'active' ? 'Archive session' : 'Reactivate session'}
          </button>
        </div>
      )}

      {isCreator && editingSession && (
        <EditSessionPanel
          sessionId={sessionId!}
          initialTitle={session.title}
          initialAuthor={session.author}
          existingChapterCount={chapters.length}
          onSaved={() => {
            setEditingSession(false)
            loadSession()
            loadChapters()
          }}
          onCancel={() => setEditingSession(false)}
        />
      )}

      {user && isCreator && session.visibility === 'private' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm">
          <span className="text-ink-soft">Invite code:</span>
          <code className="rounded bg-paper-dim px-2 py-0.5 font-mono">{session.join_code}</code>
          <button
            onClick={handleRegenerateCode}
            disabled={regenerating}
            className="ml-auto text-plum hover:underline disabled:opacity-50"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      )}

      {!isMember && session.visibility === 'public' && isActive && (
        <button
          onClick={handleJoinPublic}
          disabled={joining}
          className="mt-4 rounded-full bg-plum px-5 py-2 text-sm text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join this session'}
        </button>
      )}

      {isMember && !isCreator && isActive && (
        <button
          onClick={handleLeave}
          className="mt-4 text-sm text-ink-soft hover:text-red-600 transition-colors"
        >
          Leave session
        </button>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg">Chapters</h2>
            <div className="mt-3">
              <ChapterProgressList
                sessionId={sessionId!}
                chapters={chapters}
                completedChapterIds={user ? progressByUser[user.id] ?? new Set() : new Set()}
                disabled={!isMember || !isActive}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg">Readers</h2>
            <div className="mt-3">
              <MembersProgress
                members={members}
                totalChapters={chapters.length}
                canManage={isCreator && isActive}
                onRemove={handleRemoveMember}
              />
            </div>
          </section>
        </div>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          {isMember && isActive && (
            <form onSubmit={handlePostComment} className="rounded-2xl border border-line bg-white p-4">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Share a thought with the group…"
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-plum"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={posting || !commentDraft.trim()}
                  className="rounded-full bg-plum px-5 py-2 text-sm text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-3">
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
                No discussion yet — be the first to say something.
              </div>
            ) : (
              posts.map((post) =>
                user ? (
                  <PostItem
                    key={post.id}
                    post={post}
                    currentUserId={user.id}
                    chapterLabel={chapterLabel(post.chapterId)}
                    sessionActive={isActive}
                  />
                ) : null,
              )
            )}
            {hasMorePosts && (
              <button
                type="button"
                onClick={loadOlderPosts}
                disabled={loadingMorePosts}
                className="self-center rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft hover:border-plum hover:text-plum transition-colors disabled:opacity-50"
              >
                {loadingMorePosts ? 'Loading…' : 'Load older posts'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
