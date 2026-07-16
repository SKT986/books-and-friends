import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setError(null)
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
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
      setError(
        updateError.message.includes('unique')
          ? 'That username is already taken.'
          : updateError.message,
      )
      return
    }
    await refreshProfile()
    setSaved(true)
  }

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="text-3xl">Your profile</h1>
      <p className="mt-1 text-ink-soft">This is how other members will see you.</p>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover border border-line"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-plum-light flex items-center justify-center text-plum-dark font-serif text-xl">
              {(displayName || username || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <label className="text-sm text-plum hover:underline cursor-pointer">
            {uploading ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-soft">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-plum"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-plum-dark">Saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-full bg-plum py-2.5 text-white hover:bg-plum-dark transition-colors disabled:opacity-50"
        >
          Save changes
        </button>
      </form>
    </div>
  )
}
