import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <header className="relative border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to={user ? '/discover' : '/'}
          onClick={() => setMenuOpen(false)}
          className="font-serif text-xl text-ink shrink-0"
        >
          Books <span className="text-plum">&amp;</span> Friends
        </Link>

        {user ? (
          <>
            <nav className="hidden items-center gap-5 text-sm sm:flex">
              <Link to="/discover" className="text-ink-soft hover:text-plum transition-colors">
                Discover
              </Link>
              <Link to="/new" className="text-ink-soft hover:text-plum transition-colors">
                New session
              </Link>
              <Link
                to="/profile"
                className="text-ink-soft hover:text-plum transition-colors truncate max-w-[8rem]"
              >
                {profile?.display_name || profile?.username || 'Profile'}
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-line px-3 py-1.5 text-ink-soft hover:border-plum hover:text-plum transition-colors"
              >
                Sign out
              </button>
            </nav>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft sm:hidden"
            >
              <span className="sr-only">Menu</span>
              {menuOpen ? '✕' : '☰'}
            </button>

            {menuOpen && (
              <nav className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-line bg-paper px-4 py-3 text-sm sm:hidden">
                <Link
                  to="/discover"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-ink-soft hover:bg-paper-dim"
                >
                  Discover
                </Link>
                <Link
                  to="/new"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-ink-soft hover:bg-paper-dim"
                >
                  New session
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-ink-soft hover:bg-paper-dim"
                >
                  {profile?.display_name || profile?.username || 'Profile'}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg px-3 py-2 text-left text-ink-soft hover:bg-paper-dim"
                >
                  Sign out
                </button>
              </nav>
            )}
          </>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-ink-soft hover:text-plum transition-colors">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-plum px-4 py-1.5 text-white hover:bg-plum-dark transition-colors"
            >
              Join
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
