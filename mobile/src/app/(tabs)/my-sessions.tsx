import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { SessionCard, type SessionSummary } from '@/components/SessionCard'
import { Button } from '@/components/Button'
import { Colors, Fonts, Spacing } from '@/constants/theme'

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

export default function MySessionsScreen() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: memberRows } = await supabase.from('session_members').select('session_id').eq('user_id', user.id)
    const ids = (memberRows ?? []).map((r) => r.session_id)
    if (ids.length === 0) {
      setSessions([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('reading_sessions')
      .select(
        'id, title, author, visibility, status, session_chapters!session_chapters_session_id_fkey(count), session_members(count)',
      )
      .in('id', ids)
      .order('created_at', { ascending: false })
    setSessions(((data as RawSessionRow[] | null) ?? []).map(toSummary))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <SessionCard session={item} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <View style={styles.titleRow}>
            <Text style={styles.title}>My Sessions</Text>
            <Link href="/new" asChild>
              <Button title="+ New session" variant="ghost" onPress={() => {}} />
            </Link>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>You haven&apos;t joined any sessions yet.</Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: Spacing.lg }} color={Colors.plum} />
          )
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.ink },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.line,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: { color: Colors.inkSoft, textAlign: 'center' },
})
