'use client'

import { useEffect, useState } from 'react'

const FORM = process.env.NEXT_PUBLIC_WAITLIST_FORM
const ENTRY = process.env.NEXT_PUBLIC_WAITLIST_ENTRY_EMAIL
const KEY = 'mm_waitlisted'

export default function WaitlistBar() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(KEY) === '1') setOk(true)
  }, [])

  if (hidden) return null

  return (
    <div className="border-b border-border/60 bg-[#0e1018]">
      <div className="container py-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="text-sm">
          <span className="font-semibold">Join the MysteryMapp waitlist</span>
          <span className="text-subtext"> — get early access & help shape the app.</span>
        </div>

        {ok ? (
          <div className="ml-auto text-sm text-subtext">Thanks — you’re on the list! ✅</div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Enter a valid email')

              // If vars missing, fallback to mailto (still zero-backend)
              if (!FORM || !ENTRY) {
                window.location.href = `mailto:hello@mysterymapp.app?subject=Waitlist&body=${encodeURIComponent(email)}`
                return
              }

              try {
                setLoading(true)
                const data = new FormData()
                data.append(`entry.${ENTRY}`, email)
                await fetch(FORM, { method: 'POST', mode: 'no-cors', body: data })
                localStorage.setItem(KEY, '1')
                setOk(true)
              } finally {
                setLoading(false)
              }
            }}
            className="ml-auto flex items-center gap-2"
          >
            <input
              type="email"
              placeholder="you@email.com"
              className="chip bg-[#0b0b10] focus:outline-none px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Joining…' : 'Join'}
            </button>
          </form>
        )}

        <button className="ml-0 sm:ml-2 text-subtext text-xs underline" onClick={() => setHidden(true)}>
          hide
        </button>
      </div>
    </div>
  )
}
