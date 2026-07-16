import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { Colors, Fonts, Spacing } from '@/constants/theme'

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    // If email confirmations are disabled, Supabase signs the user in
    // immediately and never sends an email — the auth state change alone
    // will route us into the app via the root layout's guard.
    if (data.session) return
    setDone(true)
  }

  if (done) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>Almost there</Text>
        <Text style={[styles.subtitle, { textAlign: 'center', marginTop: Spacing.sm }]}>
          We sent a confirmation link to <Text style={{ color: Colors.ink, fontWeight: '600' }}>{email}</Text>.
          Click it to finish creating your account, then come back and sign in.
        </Text>
        <Link href="/login" asChild>
          <Button title="Go to sign in" onPress={() => {}} style={{ marginTop: Spacing.lg }} />
        </Link>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join Books &amp; Friends and start your first session.</Text>

        <View style={styles.form}>
          <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Jamie Rivera" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title="Create account"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!displayName || !email || password.length < 6}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/login">
            <Text style={styles.link}>Sign in</Text>
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
  form: { gap: Spacing.md, marginTop: Spacing.sm },
  error: { color: Colors.danger, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: Colors.inkSoft },
  link: { color: Colors.plum, fontWeight: '600' },
})
