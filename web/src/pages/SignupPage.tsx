import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function SignupPage() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    // If email confirmations are disabled, Supabase signs the user in
    // immediately and never sends an email — skip straight to the app.
    if (data.session) {
      navigate('/discover', { replace: true })
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-3xl">Almost there</h1>
        <p className="mt-3 text-ink-soft">
          We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click it to
          finish creating your account, then come back and sign in.
        </p>
        <Link
          to="/login"
          className="mt-6 self-center rounded-full bg-plum px-6 py-2.5 text-white hover:bg-plum-dark transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl">Create your account</h1>
      <p className="mt-1 text-ink-soft">Join Books &amp; Friends and start your first session.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Display name</span>
          <input
            type="text"
            required
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
            placeholder="Jamie Rivera"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
            placeholder="At least 6 characters"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-full bg-plum py-2.5 text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="text-plum hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
