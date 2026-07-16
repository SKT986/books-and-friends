import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 rounded-full bg-gold-light px-3 py-1 text-xs font-medium tracking-wide text-plum-dark uppercase">
        A cozy corner for book clubs
      </span>
      <h1 className="text-4xl sm:text-5xl leading-tight text-ink">
        Read together. <span className="text-plum">Talk it over.</span>
      </h1>
      <p className="mt-5 max-w-xl text-lg text-ink-soft">
        Start a reading session for any book, invite friends or open it to everyone, track your
        chapter-by-chapter progress, and keep one running conversation going the whole way through.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/signup"
          className="rounded-full bg-plum px-6 py-3 text-white shadow-sm hover:bg-plum-dark transition-colors"
        >
          Create your account
        </Link>
        <Link
          to="/login"
          className="rounded-full border border-line px-6 py-3 text-ink hover:border-plum hover:text-plum transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
