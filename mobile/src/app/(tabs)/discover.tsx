import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { SessionCard, type SessionSummary } from '@/components/SessionCard'
import { TextField } from '@/components/TextField'
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

export default function DiscoverScreen() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => clearTimeout(id)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
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
    setSessions(((data as RawSessionRow[] | null) ?? []).map(toSummary))
    setLoading(false)
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const handleJoinByCode = async () => {
    setJoinError(null)
    setJoining(true)
    const { data, error } = await supabase.rpc('join_session_by_code', { p_code: joinCode.trim() })
    setJoining(false)
    if (error) {
      setJoinError(error.message)
      return
    }
    setJoinCode('')
    router.push(`/sessions/${data}`)
  }

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
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Discover</Text>
              <Link href="/new" asChild>
                <Button title="+ New session" variant="ghost" onPress={() => {}} />
              </Link>
            </View>
            <TextField
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search title or author…"
            />
            <View style={styles.joinRow}>
              <TextField
                containerStyle={{ flex: 1 }}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="Have an invite code?"
                autoCapitalize="none"
              />
              <Button
                title="Join"
                variant="secondary"
                onPress={handleJoinByCode}
                loading={joining}
                disabled={!joinCode.trim()}
              />
            </View>
            {joinError && <Text style={styles.error}>{joinError}</Text>}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? `No sessions match "${search}".` : 'No public sessions yet — be the first to start one.'}
              </Text>
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
  header: { gap: Spacing.sm, marginBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.ink },
  joinRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  error: { color: Colors.danger, fontSize: 13 },
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
