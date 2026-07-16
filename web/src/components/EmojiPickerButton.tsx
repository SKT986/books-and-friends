import { useEffect, useRef, useState } from 'react'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'

export function EmojiPickerButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-plum hover:text-plum transition-colors"
      >
        + react
      </button>
      {open && (
        <div className="absolute z-20 mt-2">
          <EmojiPicker
            onEmojiClick={(data: EmojiClickData) => {
              onSelect(data.emoji)
              setOpen(false)
            }}
            width={300}
            height={360}
          />
        </div>
      )}
    </div>
  )
}
