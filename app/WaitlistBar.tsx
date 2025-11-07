'use client'

import { useEffect, useState } from 'react'

const FORM = process.env.NEXT_PUBLIC_WAITLIST_FORM
const ENTRY = process.env.NEXT_PUBLIC_WAITLIST_ENTRY_EMAIL
const KEY_JOINED = 'mm_waitlisted'
const KEY_HIDDEN = 'mm_waitlist_hidden_until'

function hideForAWeek() {
  const until = Date.now() + 7 * 24 * 60 * 60 * 1000
  localStorage.setItem(KEY_HIDDEN, String(until))
}

export default function WaitlistBar() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(true)
  const [stacked, setStacked] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(KEY_JOINED) === '1') setOk(true)
    const until = Number(localStorage.getItem(KEY_HIDDEN) || '0')
    if (Date.now() < until) setVisible(false)
    if (typeof window !== 'undefined') setStacked(window.innerWidth < 360)
  }, [])

  if (!visible) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Enter a valid email')
      return
    }
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
    <div className="sticky top-0 z-50 border-b border-border/40 bg-[#0e1018]/80 backdrop-blur-md transition-all">
      <div className="container mx-auto px-4">
        <div
          className={`flex items-center justify-between flex-wrap gap-2 py-2 ${
            stacked ? 'flex-col text-center' : ''
          }`}
        >
          <p className="text-sm leading-snug">
            <span className="font-medium text-white/90">Get early access</span>
            <span className="text-subtext"> — join the MysteryMapp waitlist.</span>
          </p>

          {ok ? (
            <p className="text-sm text-green-400 font-medium whitespace-nowrap">
              You’re on the list ✅
            </p>
          ) : (
            <form
              onSubmit={submit}
              className={`flex items-center gap-2 ${stacked ? 'w-full justify-center' : ''}`}
            >
              <input
                type="email"
                inputMode="email"
                placeholder="you@email.com"
                className="px-3 py-1.5 rounded-lg bg-[#1a1c25] text-sm text-white border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary w-44"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 active:scale-[0.97] transition-transform"
              >
                {loading ? 'Joining…' : 'Join'}
              </button>
            </form>
          )}

          <button
            onClick={() => {
              hideForAWeek()
              setVisible(false)
            }}
            className="text-xs text-subtext hover:text-white/80 underline underline-offset-2 decoration-dotted ml-2"
          >
            not now
          </button>
        </div>
      </div>
    </div>
  )
}
