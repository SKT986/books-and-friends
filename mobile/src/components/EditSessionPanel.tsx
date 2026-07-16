import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { TextField } from './TextField'
import { Colors, Radius, Spacing } from '@/constants/theme'

export function EditSessionPanel({
  sessionId,
  initialTitle,
  initialAuthor,
  existingChapterCount,
  onSaved,
  onCancel,
}: {
  sessionId: string
  initialTitle: string
  initialAuthor: string
  existingChapterCount: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [author, setAuthor] = useState(initialAuthor)
  const [newChaptersText, setNewChaptersText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const newChapterLines = newChaptersText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('reading_sessions')
      .update({ title, author })
      .eq('id', sessionId)

    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }

    if (newChapterLines.length > 0) {
      const rows = newChapterLines.map((line, index) => ({
        session_id: sessionId,
        chapter_number: existingChapterCount + index + 1,
        chapter_title: line,
        position: existingChapterCount + index,
      }))
      const { error: chaptersError } = await supabase.from('session_chapters').insert(rows)
      if (chaptersError) {
        setSaving(false)
        setError(chaptersError.message)
        return
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <View style={styles.panel}>
      <TextField label="Title" value={title} onChangeText={setTitle} />
      <TextField label="Author" value={author} onChangeText={setAuthor} />
      <View>
        <Text style={styles.label}>Add more chapters (one per line)</Text>
        <Text style={styles.hint}>Existing chapters can&apos;t be removed here — just add new ones.</Text>
        <TextField
          value={newChaptersText}
          onChangeText={setNewChaptersText}
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top', marginTop: Spacing.xs }}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Button title="Save changes" onPress={handleSave} loading={saving} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  label: { fontSize: 13, color: Colors.inkSoft },
  hint: { fontSize: 12, color: Colors.inkSoft, marginTop: 2 },
  error: { color: Colors.danger, fontSize: 13 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
})
