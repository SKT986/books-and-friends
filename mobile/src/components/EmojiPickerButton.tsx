import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard'
import { Colors, Radius, Spacing } from '@/constants/theme'

export function EmojiPickerButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.button}>
        <Text style={styles.buttonText}>+ react</Text>
      </Pressable>
      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={(item: EmojiType) => {
          onSelect(item.emoji)
          setOpen(false)
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
  },
  buttonText: { color: Colors.inkSoft, fontSize: 12 },
})
