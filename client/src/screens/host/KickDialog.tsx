import { useEffect, useRef, useState } from 'react'
import type { PlayerView } from '@/lib/protocol'
import { Button } from './ui'

/**
 * Manage-players dialog: lists the room's players with a Kick button each. Escape and a
 * backdrop click close it; a kicked row disables to prevent a double-kick (the row vanishes
 * on the next STATE, mirroring host.js).
 */
export default function KickDialog({
  players,
  onKick,
  onClose,
}: {
  players: PlayerView[]
  onKick: (playerId: string) => void
  onClose: () => void
}) {
  const [kicked, setKicked] = useState<Record<string, boolean>>({})
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    cardRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleKick = (id: string) => {
    setKicked((k) => ({ ...k, [id]: true }))
    onKick(id)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kickHeading"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl focus:outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="kickHeading" className="text-xl font-bold">
            Manage players
          </h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        {players.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">No players to manage.</p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1 scrollbar-hide">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-2.5"
              >
                <span className="truncate text-foreground">
                  {p.name}
                  {!p.connected && <span className="ml-1 text-sm text-muted-foreground">(dropped)</span>}
                </span>
                <Button
                  variant="danger"
                  size="md"
                  disabled={!!kicked[p.id]}
                  onClick={() => handleKick(p.id)}
                  className="h-9 px-4 text-sm"
                >
                  Kick
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
