import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Avatar } from './Avatar'
import { Colors, Radius, Spacing } from '@/constants/theme'

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
    return <Text style={styles.empty}>No readers yet.</Text>
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      {members.map((m) => {
        const pct = totalChapters === 0 ? 0 : Math.round((m.completedCount / totalChapters) * 100)
        const name = m.displayName || m.username
        return (
          <View key={m.userId} style={styles.row}>
            <Avatar url={m.avatarUrl} name={name} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                  {m.role === 'creator' && <Text style={styles.hostTag}> host</Text>}
                </Text>
                <Text style={styles.count}>
                  {m.completedCount}/{totalChapters}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
            </View>
            {canManage && m.role !== 'creator' && onRemove && (
              <Pressable onPress={() => onRemove(m.userId)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { color: Colors.inkSoft, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  name: { color: Colors.ink, fontSize: 14, flexShrink: 1 },
  hostTag: { color: Colors.gold, fontSize: 12 },
  count: { color: Colors.inkSoft, fontSize: 12 },
  track: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.paperDim, marginTop: 4 },
  fill: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.plum },
  remove: { color: Colors.inkSoft, fontSize: 12 },
})
