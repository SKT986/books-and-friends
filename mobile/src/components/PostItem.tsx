import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/timeAgo'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { TextField } from './TextField'
import { EmojiPickerButton } from './EmojiPickerButton'
import { Colors, Radius, Spacing } from '@/constants/theme'

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

  const deletePost = () => {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('thread_posts').update({ deleted_at: new Date().toISOString() }).eq('id', post.id)
        },
      },
    ])
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Avatar url={post.author.avatarUrl} name={name} />
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.time}>
              {timeAgo(post.createdAt)}
              {post.updatedAt ? ' · edited' : ''}
            </Text>
          </View>
        </View>
        {canModify && !editing && (
          <View style={styles.actionsRow}>
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
            <Pressable onPress={deletePost}>
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {editing ? (
          <View style={{ gap: Spacing.sm }}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              multiline
              numberOfLines={3}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            <View style={styles.actionsRow}>
              <Button title="Save" onPress={saveEdit} loading={saving} />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setEditing(false)
                  setDraft(post.body ?? '')
                }}
              />
            </View>
          </View>
        ) : post.postType === 'progress' ? (
          <View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>✓ finished {chapterLabel ?? 'a chapter'}</Text>
            </View>
            {post.body && <Text style={styles.noteText}>&ldquo;{post.body}&rdquo;</Text>}
          </View>
        ) : (
          <Text style={styles.commentText}>{post.body}</Text>
        )}
      </View>

      <View style={styles.reactionsRow}>
        {Object.entries(grouped).map(([emoji, list]) => {
          const mine = list.some((r) => r.userId === currentUserId)
          return (
            <Pressable
              key={emoji}
              onPress={() => toggleReaction(emoji)}
              style={[styles.reactionChip, mine && styles.reactionChipMine]}
            >
              <Text style={[styles.reactionText, mine && styles.reactionTextMine]}>
                {emoji} {list.length}
              </Text>
            </Pressable>
          )
        })}
        {sessionActive && <EmojiPickerButton onSelect={toggleReaction} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', gap: Spacing.sm, flexShrink: 1 },
  name: { color: Colors.ink, fontWeight: '600', fontSize: 14 },
  time: { color: Colors.inkSoft, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionText: { color: Colors.inkSoft, fontSize: 12 },
  deleteText: { color: Colors.danger },
  body: {},
  commentText: { color: Colors.ink, fontSize: 14, lineHeight: 20 },
  progressBadge: {
    backgroundColor: Colors.goldLight,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  progressBadgeText: { color: Colors.plumDark, fontSize: 12, fontWeight: '600' },
  noteText: { color: Colors.ink, fontStyle: 'italic', marginTop: Spacing.xs, fontSize: 14 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  reactionChip: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  reactionChipMine: { borderColor: Colors.plum, backgroundColor: Colors.plumLight },
  reactionText: { fontSize: 12, color: Colors.inkSoft },
  reactionTextMine: { color: Colors.plumDark },
})
