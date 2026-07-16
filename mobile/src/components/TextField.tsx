import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { Colors, Radius, Spacing } from '@/constants/theme'

export function TextField({
  label,
  containerStyle,
  style,
  ...inputProps
}: TextInputProps & { label?: string; containerStyle?: object }) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput placeholderTextColor={Colors.inkSoft} style={[styles.input, style]} {...inputProps} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: 13, color: Colors.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: Colors.white,
  },
})
