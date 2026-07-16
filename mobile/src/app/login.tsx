import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme'

export default function LoginScreen() {
  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handlePasswordSignIn = async () => {
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) setError(error.message)
  }

  const handleMagicLink = async () => {
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('Check your inbox for a sign-in link.')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to jump back into your sessions.</Text>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => {
            setMode('password')
            setError(null)
            setInfo(null)
          }}
          style={[styles.toggleBtn, mode === 'password' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, mode === 'password' && styles.toggleTextActive]}>Password</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode('magic-link')
            setError(null)
            setInfo(null)
          }}
          style={[styles.toggleBtn, mode === 'magic-link' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, mode === 'magic-link' && styles.toggleTextActive]}>Email link</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        {mode === 'password' && (
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Button
          title={mode === 'password' ? 'Sign in' : 'Send magic link'}
          onPress={mode === 'password' ? handlePasswordSignIn : handleMagicLink}
          loading={submitting}
          disabled={!email || (mode === 'password' && !password)}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New here? </Text>
        <Link href="/signup">
          <Text style={styles.link}>Create an account</Text>
        </Link>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  title: { fontFamily: Fonts.serif, fontSize: 30, color: Colors.ink },
  subtitle: { color: Colors.inkSoft, fontSize: 15, marginTop: -Spacing.xs },
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.full,
    padding: 4,
    marginTop: Spacing.sm,
  },
  toggleBtn: { flex: 1, paddingVertical: Spacing.xs + 2, alignItems: 'center', borderRadius: Radius.full },
  toggleBtnActive: { backgroundColor: Colors.plum },
  toggleText: { color: Colors.inkSoft, fontSize: 14 },
  toggleTextActive: { color: Colors.white, fontWeight: '600' },
  form: { gap: Spacing.md, marginTop: Spacing.sm },
  error: { color: Colors.danger, fontSize: 13 },
  info: { color: Colors.plumDark, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: Colors.inkSoft },
  link: { color: Colors.plum, fontWeight: '600' },
})
