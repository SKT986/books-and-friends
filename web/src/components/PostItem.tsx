import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/timeAgo'
import { EmojiPickerButton } from './EmojiPickerButton'

export interface ReactionInfo {
  id: string
  userId: string
  emoji: string
}

export interface PostInfo {
  id: string
  userId: string
  postType: 'comment' | 'progress'
  body: string | null
  chapterId: string | null
  createdAt: string
  updatedAt: string | null
  author: { displayName: string | null; username: string; avatarUrl: string | null }
  reactions: ReactionInfo[]
}

export function PostItem({
  post,
  currentUserId,
  chapterLabel,
  sessionActive,
}: {
  post: PostInfo
  currentUserId: string
  chapterLabel?: string
  sessionActive: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.body ?? '')
  const [saving, setSaving] = useState(false)

  const grouped = post.reactions.reduce<Record<string, ReactionInfo[]>>((acc, r) => {
    ;(acc[r.emoji] ??= []).push(r)
    return acc
  }, {})

  const name = post.author.displayName || post.author.username
  const canModify = sessionActive && post.userId === currentUserId

  const toggleReaction = async (emoji: string) => {
    const mine = post.reactions.find((r) => r.emoji === emoji && r.userId === currentUserId)
    if (mine) {
      await supabase.from('reactions').delete().eq('id', mine.id)
    } else {
      await supabase.from('reactions').insert({ post_id: post.id, user_id: currentUserId, emoji })
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    await supabase.from('thread_posts').update({ body: draft.trim() || null }).eq('id', post.id)
    setSaving(false)
    setEditing(false)
  }

  const deletePost = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    await supabase.from('thread_posts').update({ deleted_at: new Date().toISOString() }).eq('id', post.id)
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-plum-light text-xs font-medium text-plum-dark">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="text-xs text-ink-soft">
              {timeAgo(post.createdAt)}
              {post.updatedAt && ' · edited'}
            </p>
          </div>
        </div>

        {canModify && !editing && (
          <div className="flex shrink-0 gap-2 text-xs text-ink-soft">
            <button type="button" onClick={() => setEditing(true)} className="hover:text-plum transition-colors">
              Edit
            </button>
            <button type="button" onClick={deletePost} className="hover:text-red-600 transition-colors">
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="mt-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-plum"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="rounded-full bg-plum px-3 py-1 text-xs text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setDraft(post.body ?? '')
                }}
                className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-plum"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : post.postType === 'progress' ? (
          <div className="text-sm">
            <span className="mr-1.5 inline-block rounded-full bg-gold-light px-2 py-0.5 text-xs font-medium text-plum-dark">
              ✓ finished {chapterLabel ?? 'a chapter'}
            </span>
            {post.body && <p className="mt-1.5 italic text-ink">&ldquo;{post.body}&rdquo;</p>}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-ink">{post.body}</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {Object.entries(grouped).map(([emoji, list]) => {
          const mine = list.some((r) => r.userId === currentUserId)
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleReaction(emoji)}
              className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                mine ? 'border-plum bg-plum-light text-plum-dark' : 'border-line text-ink-soft hover:border-plum'
              }`}
            >
              {emoji} {list.length}
            </button>
          )
        })}
        {sessionActive && <EmojiPickerButton onSelect={toggleReaction} />}
      </div>
    </div>
  )
}
