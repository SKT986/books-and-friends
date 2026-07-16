import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { TextField } from './TextField'
import { Colors, Spacing } from '@/constants/theme'

export interface ChapterInfo {
  id: string
  chapterNumber: number
  chapterTitle: string | null
}

export function ChapterProgressList({
  sessionId,
  chapters,
  completedChapterIds,
  disabled,
}: {
  sessionId: string
  chapters: ChapterInfo[]
  completedChapterIds: Set<string>
  disabled?: boolean
}) {
  const [openNoteFor, setOpenNoteFor] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const markComplete = async (chapterId: string, note: string) => {
    setBusyId(chapterId)
    await supabase.rpc('toggle_chapter_complete', {
      p_session_id: sessionId,
      p_chapter_id: chapterId,
      p_completed: true,
      p_note: note.trim() || null,
    })
    setBusyId(null)
    setOpenNoteFor(null)
    setNoteDraft('')
  }

  const undo = async (chapterId: string) => {
    setBusyId(chapterId)
    await supabase.rpc('toggle_chapter_complete', {
      p_session_id: sessionId,
      p_chapter_id: chapterId,
      p_completed: false,
    })
    setBusyId(null)
  }

  if (chapters.length === 0) {
    return <Text style={styles.empty}>No chapters yet.</Text>
  }

  return (
    <View>
      {chapters.map((chapter, index) => {
        const done = completedChapterIds.has(chapter.id)
        return (
          <View key={chapter.id} style={[styles.row, index > 0 && styles.rowBorder]}>
            <View style={styles.rowMain}>
              <Pressable
                disabled={disabled || busyId === chapter.id}
                onPress={() => (done ? undo(chapter.id) : setOpenNoteFor(chapter.id))}
                style={[styles.checkbox, done && styles.checkboxDone, disabled && styles.checkboxDisabled]}
              >
                {done && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
              <Text style={[styles.chapterText, done && styles.chapterTextDone]}>
                {chapter.chapterNumber}. {chapter.chapterTitle}
              </Text>
            </View>

            {openNoteFor === chapter.id && (
              <View style={styles.noteBox}>
                <TextField
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="Share a quick thought (optional)"
                  multiline
                  numberOfLines={2}
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                />
                <View style={styles.noteActions}>
                  <Button title="Mark complete" onPress={() => markComplete(chapter.id, noteDraft)} />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setOpenNoteFor(null)
                      setNoteDraft('')
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { color: Colors.inkSoft, fontSize: 14 },
  row: { paddingVertical: Spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.line },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.plum, borderColor: Colors.plum },
  checkboxDisabled: { opacity: 0.5 },
  checkmark: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  chapterText: { flex: 1, color: Colors.ink, fontSize: 15 },
  chapterTextDone: { color: Colors.inkSoft, textDecorationLine: 'line-through' },
  noteBox: { marginTop: Spacing.sm, marginLeft: 32, gap: Spacing.sm },
  noteActions: { flexDirection: 'row', gap: Spacing.sm },
})
