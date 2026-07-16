import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/discover'

  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handlePasswordSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate(from, { replace: true })
  }

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('Check your inbox for a sign-in link.')
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-1 text-ink-soft">Sign in to jump back into your sessions.</p>

      <div className="mt-6 flex rounded-full border border-line p-1 text-sm">
        <button
          className={`flex-1 rounded-full py-1.5 transition-colors ${
            mode === 'password' ? 'bg-plum text-white' : 'text-ink-soft'
          }`}
          onClick={() => {
            setMode('password')
            setError(null)
            setInfo(null)
          }}
        >
          Password
        </button>
        <button
          className={`flex-1 rounded-full py-1.5 transition-colors ${
            mode === 'magic-link' ? 'bg-plum text-white' : 'text-ink-soft'
          }`}
          onClick={() => {
            setMode('magic-link')
            setError(null)
            setInfo(null)
          }}
        >
          Email link
        </button>
      </div>

      <form
        onSubmit={mode === 'password' ? handlePasswordSignIn : handleMagicLink}
        className="mt-6 flex flex-col gap-4"
      >
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

        {mode === 'password' && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-ink-soft">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
              placeholder="••••••••"
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-plum-dark">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-full bg-plum py-2.5 text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
        >
          {mode === 'password' ? 'Sign in' : 'Send magic link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{' '}
        <Link to="/signup" className="text-plum hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
