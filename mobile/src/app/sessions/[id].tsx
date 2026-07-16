import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { ReadingSession } from '@/types/database'
import { ChapterProgressList, type ChapterInfo } from '@/components/ChapterProgressList'
import { MembersProgress, type MemberInfo } from '@/components/MembersProgress'
import { PostItem, type PostInfo } from '@/components/PostItem'
import { EditSessionPanel } from '@/components/EditSessionPanel'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme'

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

export default function SessionDetailScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()

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
    setChapters((data ?? []).map((c) => ({ id: c.id, chapterNumber: c.chapter_number, chapterTitle: c.chapter_title })))
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

  const handleLeave = () => {
    Alert.alert('Leave this session?', 'You can rejoin later if it stays public or you keep the invite link.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!user || !sessionId) return
          await supabase.from('session_members').delete().eq('session_id', sessionId).eq('user_id', user.id)
          router.replace('/(tabs)/my-sessions')
        },
      },
    ])
  }

  const handleRemoveMember = (memberUserId: string) => {
    Alert.alert('Remove this reader?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!sessionId) return
          await supabase.from('session_members').delete().eq('session_id', sessionId).eq('user_id', memberUserId)
          await loadMembersAndProgress()
        },
      },
    ])
  }

  const handleToggleArchive = () => {
    if (!sessionId || !session) return
    const nextStatus = session.status === 'active' ? 'archived' : 'active'
    const apply = async () => {
      setArchiving(true)
      await supabase.from('reading_sessions').update({ status: nextStatus }).eq('id', sessionId)
      await loadSession()
      setArchiving(false)
    }
    if (nextStatus === 'archived') {
      Alert.alert('Archive this session?', 'It becomes fully read-only for everyone until reactivated.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: apply },
      ])
    } else {
      apply()
    }
  }

  const handlePostComment = async () => {
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
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.plum} />
      </View>
    )
  }

  if (session === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>Session not found</Text>
        <Text style={styles.notFoundBody}>
          It may be private, archived, or the link is incorrect. Ask the host for a fresh invite.
        </Text>
      </View>
    )
  }

  const chapterLabel = (chapterId: string | null) =>
    chapterId ? chapters.find((c) => c.id === chapterId)?.chapterTitle ?? undefined : undefined

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: session.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.author}>by {session.author}</Text>
          <View style={styles.badgeRow}>
            {session.visibility === 'private' && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Private</Text>
              </View>
            )}
            {session.status === 'archived' && (
              <View style={[styles.badge, styles.badgeMuted]}>
                <Text style={[styles.badgeText, styles.badgeTextMuted]}>Archived</Text>
              </View>
            )}
          </View>
        </View>

        {isCreator && (
          <View style={styles.creatorActions}>
            <Button title={editingSession ? 'Close editor' : 'Edit session'} variant="ghost" onPress={() => setEditingSession((v) => !v)} />
            <Button
              title={session.status === 'active' ? 'Archive session' : 'Reactivate session'}
              variant="ghost"
              onPress={handleToggleArchive}
              loading={archiving}
            />
          </View>
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

        {isCreator && session.visibility === 'private' && (
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>Invite code:</Text>
            <Text style={styles.inviteCode}>{session.join_code}</Text>
            <View style={{ flex: 1 }} />
            <Button title={regenerating ? 'Regenerating…' : 'Regenerate'} variant="ghost" onPress={handleRegenerateCode} loading={regenerating} />
          </View>
        )}

        {!isMember && session.visibility === 'public' && isActive && (
          <Button title="Join this session" onPress={handleJoinPublic} loading={joining} />
        )}

        {isMember && !isCreator && isActive && <Button title="Leave session" variant="ghost" onPress={handleLeave} />}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chapters</Text>
          <ChapterProgressList
            sessionId={sessionId!}
            chapters={chapters}
            completedChapterIds={user ? progressByUser[user.id] ?? new Set() : new Set()}
            disabled={!isMember || !isActive}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Readers</Text>
          <MembersProgress
            members={members}
            totalChapters={chapters.length}
            canManage={isCreator && isActive}
            onRemove={handleRemoveMember}
          />
        </View>

        {isMember && isActive && (
          <View style={styles.composer}>
            <TextField
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Share a thought with the group…"
              multiline
              numberOfLines={3}
              maxLength={2000}
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            <Button title="Post" onPress={handlePostComment} loading={posting} disabled={!commentDraft.trim()} />
          </View>
        )}

        <View style={{ gap: Spacing.sm }}>
          {posts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No discussion yet — be the first to say something.</Text>
            </View>
          ) : (
            posts.map((post) =>
              user ? (
                <PostItem key={post.id} post={post} currentUserId={user.id} chapterLabel={chapterLabel(post.chapterId)} sessionActive={isActive} />
              ) : null,
            )
          )}
          {hasMorePosts && (
            <Button title={loadingMorePosts ? 'Loading…' : 'Load older posts'} variant="secondary" onPress={loadOlderPosts} loading={loadingMorePosts} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper, padding: Spacing.lg, gap: Spacing.sm },
  notFoundTitle: { fontFamily: Fonts.serif, fontSize: 22, color: Colors.ink },
  notFoundBody: { color: Colors.inkSoft, textAlign: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.serif, fontSize: 26, color: Colors.ink },
  author: { color: Colors.inkSoft, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  badge: { backgroundColor: Colors.goldLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeMuted: { backgroundColor: Colors.paperDim },
  badgeText: { color: Colors.plumDark, fontSize: 11, fontWeight: '600' },
  badgeTextMuted: { color: Colors.inkSoft },
  creatorActions: { flexDirection: 'row', gap: Spacing.md },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inviteLabel: { color: Colors.inkSoft, fontSize: 13 },
  inviteCode: { fontFamily: 'monospace', backgroundColor: Colors.paperDim, paddingHorizontal: Spacing.xs, borderRadius: 4 },
  section: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.ink },
  composer: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.line,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: { color: Colors.inkSoft, textAlign: 'center' },
})
