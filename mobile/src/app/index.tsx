import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { Button } from '@/components/Button'
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme'

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.badge}>A COZY CORNER FOR BOOK CLUBS</Text>
        <Text style={styles.title}>
          Read together. <Text style={styles.titleAccent}>Talk it over.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Start a reading session for any book, invite friends or open it to everyone, track your
          chapter-by-chapter progress, and keep one running conversation going the whole way through.
        </Text>
        <View style={styles.actions}>
          <Link href="/signup" asChild>
            <Button title="Create your account" onPress={() => {}} />
          </Link>
          <Link href="/login" asChild>
            <Button title="Sign in" variant="secondary" onPress={() => {}} />
          </Link>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  badge: {
    backgroundColor: Colors.goldLight,
    color: Colors.plumDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    color: Colors.ink,
  },
  titleAccent: { color: Colors.plum },
  subtitle: {
    textAlign: 'center',
    color: Colors.inkSoft,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 420,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
})
