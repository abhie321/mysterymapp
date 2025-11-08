'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const FORM  = process.env.NEXT_PUBLIC_WAITLIST_FORM
const ENTRY = process.env.NEXT_PUBLIC_WAITLIST_ENTRY_EMAIL

const KEY_JOINED  = 'mm_waitlisted'            // localStorage flag
const KEY_HIDDEN  = 'mm_waitlist_hidden_until' // snooze timestamp
const COOKIE_JOINED = 'mm_waitlisted=1'        // cookie flag
const HIDE_DAYS   = 14                         // "Maybe later" snooze

/** ---------------- helpers ---------------- **/
function hideUntil(days: number) {
  const until = Date.now() + days * 24 * 60 * 60 * 1000
  localStorage.setItem(KEY_HIDDEN, String(until))
}

function setJoinedForever() {
  // 1) localStorage
  localStorage.setItem(KEY_JOINED, '1')
  // 2) cookie (5 years)
  const maxAge = 60 * 60 * 24 * 365 * 5
  document.cookie = `${COOKIE_JOINED}; path=/; max-age=${maxAge}; samesite=lax`
}

function hasJoined() {
  // localStorage or cookie means joined
  const ls = localStorage.getItem(KEY_JOINED) === '1'
  const ck = document.cookie.includes(COOKIE_JOINED)
  return ls || ck
}

/** -------------------------------- Splash -------------------------------- **/
export default function SplashWaitlist() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)

  // decide if we should show splash
  useEffect(() => {
    // joined? never show again
    if (hasJoined()) return

    // snoozed?
    const until = Number(localStorage.getItem(KEY_HIDDEN) || '0')
    if (Date.now() < until) return

    setShow(true)
    // lock background scroll on iOS
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!show) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Enter a valid email')
      return
    }

    if (!FORM || !ENTRY) {
      // zero-backend fallback
      setJoinedForever()
      setOk(true)
      setTimeout(close, 900)
      window.location.href = `mailto:hello@mysterymapp.app?subject=MysteryMapp Waitlist&body=${encodeURIComponent(email)}`
      return
    }

    try {
      setLoading(true)
      const data = new FormData()
      data.append(`entry.${ENTRY}`, email)
      // no-cors means we can’t read response; assume success
      await fetch(FORM, { method: 'POST', mode: 'no-cors', body: data })
      setJoinedForever()
      setOk(true)
      setTimeout(close, 900)
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setShow(false)
    document.body.style.overflow = '' // restore scroll
  }

  function maybeLater() {
    hideUntil(HIDE_DAYS)
    close()
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          aria-label="Join MysteryMapp waitlist"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-[#0f1118] shadow-2xl"
          >
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center">
                  <span className="text-primary font-bold">M</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold leading-tight">MysteryMapp</h2>
                  <p className="text-xs text-subtext uppercase tracking-wide">alpha access</p>
                </div>
              </div>

              <p className="text-sm text-subtext">
                Discover hidden gems that match your vibe. Join the waitlist to get early access.
              </p>

              {ok ? (
                <div className="rounded-lg bg-green-600/15 border border-green-600/30 px-3 py-2 text-green-300 text-sm">
                  You’re on the list. Welcome! ✅
                </div>
              ) : (
                <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    className="px-3 py-2 rounded-lg bg-[#0b0d13] border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary sm:w-28"
                    aria-label="Join waitlist"
                  >
                    {loading ? 'Joining…' : 'Join'}
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={maybeLater}
                  className="text-xs text-subtext underline underline-offset-2 decoration-dotted"
                >
                  Maybe later
                </button>
                <button
                  onClick={close}
                  className="text-xs text-subtext hover:text-white/80"
                  aria-label="Close"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

