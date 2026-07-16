import { forwardRef } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native'
import { Colors, Radius, Spacing } from '@/constants/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string
  onPress?: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  { title, onPress, variant = 'primary', disabled = false, loading = false, style, ...rest },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.plum} />
      ) : (
        <Text style={[styles.text, textVariantStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  )
})

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { fontSize: 15, fontWeight: '600' },
})

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: Colors.plum },
  secondary: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line },
})

const textVariantStyles = StyleSheet.create({
  primary: { color: Colors.white },
  secondary: { color: Colors.ink },
  ghost: { color: Colors.plum },
  danger: { color: Colors.danger },
})
