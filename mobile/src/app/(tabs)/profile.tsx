import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Colors, Fonts, Spacing } from '@/constants/theme'

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Photo library access is needed to set an avatar.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (result.canceled || !user) return

    setUploading(true)
    setError(null)
    const asset = result.assets[0]
    const response = await fetch(asset.uri)
    const arrayBuffer = await response.arrayBuffer()
    const ext = asset.uri.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: true,
    })
    setUploading(false)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username, display_name: displayName, avatar_url: avatarUrl })
      .eq('id', user.id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message.includes('unique') ? 'That username is already taken.' : updateError.message)
      return
    }
    await refreshProfile()
    setSaved(true)
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Your profile</Text>
          <Text style={styles.subtitle}>This is how other members will see you.</Text>

          <View style={styles.avatarRow}>
            <Avatar url={avatarUrl} name={displayName || username} size={64} />
            <Pressable onPress={handlePickAvatar} disabled={uploading}>
              <Text style={styles.changePhoto}>{uploading ? 'Uploading…' : 'Change photo'}</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <TextField label="Display name" value={displayName} onChangeText={setDisplayName} />
            <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />

            {error && <Text style={styles.error}>{error}</Text>}
            {saved && <Text style={styles.saved}>Saved.</Text>}

            <Button title="Save changes" onPress={handleSave} loading={saving} />
          </View>

          <Button title="Sign out" variant="danger" onPress={handleSignOut} style={{ marginTop: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.ink },
  subtitle: { color: Colors.inkSoft },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  changePhoto: { color: Colors.plum, fontWeight: '600' },
  form: { gap: Spacing.md, marginTop: Spacing.sm },
  error: { color: Colors.danger, fontSize: 13 },
  saved: { color: Colors.plumDark, fontSize: 13 },
})
