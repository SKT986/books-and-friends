import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme'

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
  const router = useRouter()
  return (
    <Pressable
      onPress={() => router.push(`/sessions/${session.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {session.title}
        </Text>
        {session.visibility === 'private' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Private</Text>
          </View>
        )}
      </View>
      <Text style={styles.author}>by {session.author}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{session.chapterCount} chapters</Text>
        <Text style={styles.meta}>·</Text>
        <Text style={styles.meta}>
          {session.memberCount} {session.memberCount === 1 ? 'reader' : 'readers'}
        </Text>
        {session.status === 'archived' && (
          <>
            <Text style={styles.meta}>·</Text>
            <Text style={styles.meta}>Archived</Text>
          </>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  pressed: { opacity: 0.8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  title: { flex: 1, fontFamily: Fonts.serif, fontSize: 18, color: Colors.ink },
  author: { color: Colors.inkSoft, fontSize: 14 },
  badge: {
    backgroundColor: Colors.goldLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { color: Colors.plumDark, fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  meta: { fontSize: 12, color: Colors.inkSoft },
})
