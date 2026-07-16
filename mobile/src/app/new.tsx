import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Colors, Radius, Spacing } from '@/constants/theme'
import type { Visibility } from '@/types/database'

export default function NewSessionScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [chapterText, setChapterText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const chapterLines = chapterText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const handleSubmit = async () => {
    if (!user) return
    if (chapterLines.length === 0) {
      setError('Add at least one chapter.')
      return
    }
    setError(null)
    setSubmitting(true)

    const { data: session, error: sessionError } = await supabase
      .from('reading_sessions')
      .insert({ title, author, visibility, creator_id: user.id })
      .select()
      .single()

    if (sessionError || !session) {
      setSubmitting(false)
      setError(sessionError?.message ?? 'Could not create session.')
      return
    }

    const chapterRows = chapterLines.map((line, index) => ({
      session_id: session.id,
      chapter_number: index + 1,
      chapter_title: line,
      position: index,
    }))
    const { error: chaptersError } = await supabase.from('session_chapters').insert(chapterRows)

    setSubmitting(false)
    if (chaptersError) {
      setError(chaptersError.message)
      return
    }

    router.replace(`/sessions/${session.id}`)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="The Night Circus" />
        <TextField label="Author" value={author} onChangeText={setAuthor} placeholder="Erin Morgenstern" />

        <View style={styles.field}>
          <Text style={styles.label}>Who can join?</Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setVisibility('public')}
              style={[styles.toggleBtn, visibility === 'public' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, visibility === 'public' && styles.toggleTextActive]}>Public</Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility('private')}
              style={[styles.toggleBtn, visibility === 'private' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, visibility === 'private' && styles.toggleTextActive]}>
                Private (invite only)
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Chapters (one per line)</Text>
          <TextField
            value={chapterText}
            onChangeText={setChapterText}
            placeholder={'The Circus Arrives\nAlways/Never\nA Man of Puzzles'}
            multiline
            numberOfLines={8}
            style={styles.chaptersInput}
          />
          <Text style={styles.hint}>
            {chapterLines.length} chapter{chapterLines.length === 1 ? '' : 's'}
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title="Create session" onPress={handleSubmit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontSize: 13, color: Colors.inkSoft },
  toggleRow: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.full, padding: 4 },
  toggleBtn: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.sm, borderRadius: Radius.full },
  toggleBtnActive: { backgroundColor: Colors.plum },
  toggleText: { color: Colors.inkSoft, fontSize: 13 },
  toggleTextActive: { color: Colors.white, fontWeight: '600' },
  chaptersInput: { minHeight: 140, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: Colors.inkSoft },
  error: { color: Colors.danger, fontSize: 13 },
})
