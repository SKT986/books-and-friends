import { Image, StyleSheet, Text, View } from 'react-native'
import { Colors } from '@/constants/theme'

export function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 }
  if (url) {
    return <Image source={{ uri: url }} style={[styles.image, dimension]} />
  }
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.paperDim },
  fallback: {
    backgroundColor: Colors.plumLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: Colors.plumDark, fontWeight: '600' },
})
