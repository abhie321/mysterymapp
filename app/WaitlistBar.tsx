'use client'

import { useEffect, useState } from 'react'

const FORM = process.env.NEXT_PUBLIC_WAITLIST_FORM
const ENTRY = process.env.NEXT_PUBLIC_WAITLIST_ENTRY_EMAIL

const KEY_JOINED = 'mm_waitlisted'
const KEY_HIDDEN = 'mm_waitlist_hidden_until'

// helper: store “hidden until” 7 days from now
function hideForAWeek() {
  const until = Date.now() + 7 * 24 * 60 * 60 * 1000
  localStorage.setItem(KEY_HIDDEN, String(until))
}

export default function WaitlistBar() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(true)
  const [compact, setCompact] = useState(true) // mobile-first

  useEffect(() => {
    // already joined?
    if (localStorage.getItem(KEY_JOINED) === '1') setOk(true)

    // hide if user dismissed within last 7 days
    const until = Number(localStorage.getItem(KEY_HIDDEN) || '0')
    if (Date.now() < until) setVisible(false)

    // compact on small screens, comfy on md+
    if (typeof window !== 'undefined') setCompact(window.innerWidth < 768)
  }, [])

  if (!visible) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Enter a valid email')
      return
    }

    // fail-safe: if env vars missing, fall back to mailto (still zero-backend)
    if (!FORM || !ENTRY) {
      window.location.href = `mailto:hello@mysterymapp.app?subject=MysteryMapp Waitlist&body=${encodeURIComponent(email)}`
      return
    }

    try {
      setLoading(true)
      const data = new FormData()
      data.append(`entry.${ENTRY}`, email)
      await fetch(FORM, { method: 'POST', mode: 'no-cors', body: data })
      localStorage.setItem(KEY_JOINED, '1')
      setOk(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-b border-border/60 bg-[#0e1018]/95 backdrop-blur">
      <div className="container py-2">
        {/* Compact mobile layout: stacked; Desktop: inline */}
        <div className={`flex ${compact ? 'flex-col gap-2' : 'flex-row items-center gap-3'}`}>
          <div className="text-sm leading-snug">
            <span className="font-semibold">Get early access</span>
            <span className="text-subtext"> — join the MysteryMapp waitlist.</span>
          </div>

          {ok ? (
            <div className={`${compact ? '' : 'ml-auto'} text-sm text-subtext`}>
              Thanks — you’re on the list! ✅
            </div>
          ) : (
            <form
              onSubmit={submit}
              className={`${compact ? 'grid grid-cols-1 gap-2' : 'ml-auto flex items-center gap-2'}`}
            >
              <input
                type="email"
                inputMode="email"
                placeholder="you@email.com"
                className="chip w-full bg-[#0b0b10] focus:outline-none px-3 py-2 min-w-0"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                required
              />
              <button className="btn btn-primary shrink-0" disabled={loading} aria-label="Join waitlist">
                {loading ? 'Joining…' : 'Join'}
              </button>
            </form>
          )}

          {/* right-side actions (wrap under on mobile) */}
          <div className={`${compact ? 'flex items-center justify-between' : 'ml-2'} text-xs`}>
            <button
              className="text-subtext underline decoration-dotted underline-offset-2"
              onClick={() => {
                hideForAWeek()
                setVisible(false)
              }}
              aria-label="Hide waitlist bar"
            >
              not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
