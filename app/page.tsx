'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import SplashWaitlist from './SplashWaitlist'

/* -------------------------- Types -------------------------- */
type Venue = {
  venue_id?: string
  name: string
  type: string
  city?: string
  price_avg?: number
  budget?: string
  vibes?: string[]
  vibe?: string[]
  address?: string
  location?: string
  map_url?: string
  mapUrl?: string
  image?: string
  imageUrl?: string
}

/* -------------------- Defaults / constants -------------------- */
const DEFAULT_VIBES = [
  'cozy','indie','quiet','vibrant','romantic','retro',
  'artsy','hidden','minimalist','aesthetic','late-night',
  'views','casual','lively','outdoor','classy','bohemian'
] as const

/* -------------------- CSV helpers (robust) -------------------- */
function smartSplit(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) { out.push(cur); cur = '' }
    else { cur += ch }
  }
  out.push(cur)
  return out
}
function parseCSV(text: string): any[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
  if (!lines.length) return []
  const headers = smartSplit(lines[0]).map(h => h.trim())
  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = smartSplit(lines[i])
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? '').trim()))
    rows.push(obj)
  }
  return rows
}

/* -------- Flexible key lookup (matches row keys safely) ------- */
const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase()
function getAny(row: Record<string, any>, ...candidates: string[]): any {
  const table: Record<string, string> = {}
  for (const k of Object.keys(row)) table[norm(k)] = k
  for (const c of candidates) {
    const nk = norm(c)
    if (nk in table) return row[table[nk]]
  }
  return undefined
}

/* ----------------- Row→Venue (flexible mapping) ---------------- */
function mapRowToVenue(row: any): Venue {
  const name = getAny(row, 'name', 'venue') ?? ''
  const type = getAny(row, 'type') ?? ''
  const city = getAny(row, 'city') ?? ''

  const price = getAny(row, 'price_avg', 'price', 'avg price', 'price per person', 'pp') ?? ''
  const price_num =
    typeof price === 'number'
      ? price
      : Number(String(price).replace(/[^0-9.]/g, '')) || undefined

  const vibesRaw = getAny(row, 'vibes', 'vibe') ?? ''
  const vibesArr = Array.isArray(vibesRaw)
    ? (vibesRaw as string[])
    : String(vibesRaw || '')
        .split(/[|,/]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

  const address = getAny(row, 'address', 'location') ?? ''

  const image = getAny(
    row,
    'image','imageUrl','image url','image link',
    'image_url','img','photo','cover'
  ) ?? ''

  const mapUrl = getAny(
    row,
    'map_url','mapUrl','map url','maps link','google maps'
  ) ?? ''

  return {
    name,
    type,
    city,
    price_avg: price_num,
    vibes: vibesArr,
    address,
    image,
    mapUrl,
  }
}

/* ---------------- Image URL normalizer / fallback ---------------- */
function normalizeImageUrl(raw?: string): string {
  if (!raw) return ''
  let url = String(raw).trim()

  if (/^www\./i.test(url)) url = `https://${url}`
  if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) return ''

  const driveMatch =
    url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
    url.match(/[?&]id=([^&]+)/)
  if (driveMatch?.[1]) {
    const id = driveMatch[1]
    url = `https://drive.google.com/uc?export=view&id=${id}`
  }

  const host = (() => { try { return new URL(url).host.toLowerCase() } catch { return '' } })()
  const likelyBlocked = ['photos.google.com','instagram.com','scontent.cdninstagram.com']
  if (likelyBlocked.includes(host) || url.includes('photos.google.com')) {
    const noScheme = url.replace(/^https?:\/\//i, '')
    url = `https://images.weserv.nl/?url=${encodeURIComponent(noScheme)}&w=1200&h=800&fit=cover&we`
  }
  return url
}

/* ------------------------- Content ------------------------- */
function PageContent() {
  const [showSplash, setShowSplash] = useState(true)

  const [venues, setVenues] = useState<Venue[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [vibes, setVibes] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [budget, setBudget] = useState<number>(25)
  const [submitted, setSubmitted] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  /* Splash persistence */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const done = localStorage.getItem('waitlistEmail')
    if (done) setShowSplash(false)
  }, [])

  /* Fetch from sheet (JSON or CSV) */
  useEffect(() => {
    const run = async () => {
      const url = process.env.NEXT_PUBLIC_SHEET_CSV
      if (!url) {
        setLoadError('Missing NEXT_PUBLIC_SHEET_CSV env var.')
        setVenues([])
        return
      }
      try {
        const res = await fetch(url, { cache: 'no-store' })
        const raw = await res.text()
        const trimmed = raw.trim()
        let rows: any[] = []
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          const json = JSON.parse(trimmed)
          rows = Array.isArray(json) ? json : (json?.data ?? [])
        } else {
          rows = parseCSV(raw)
        }
        const mapped = rows.map(mapRowToVenue).filter(v => v.name)

        // De-dup by name to keep sheet robust
        const deduped = Array.from(
          new Map(mapped.map(m => [m.name.toLowerCase(), m])).values()
        )

        setVenues(deduped)
        setLoadError(null)
      } catch (e) {
        console.error('Failed to load venues:', e)
        setLoadError('Could not load venues. Please try again later.')
        setVenues([])
      }
    }
    run()
  }, [])

  /* Read initial query from URL (once) */
  useEffect(() => {
    const v = searchParams.get('v')?.split(',').filter(Boolean) ?? []
    const t = searchParams.get('t')?.split('|').filter(Boolean) ?? []
    const b = Number(searchParams.get('b'))
    const go = searchParams.get('go') === '1'
    if (v.length) setVibes(v)
    if (t.length) setTypes(t)
    if (!Number.isNaN(b) && b > 0) setBudget(b)
    if (go) setSubmitted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Debounced URL sync (nicer UX) */
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (vibes.length) params.set('v', vibes.join(','))
      if (types.length) params.set('t', types.join('|'))
      if (budget) params.set('b', String(budget))
      if (submitted) params.set('go', '1')
      router.replace(params.toString() ? `/?${params.toString()}` : '/', { scroll: false })
    }, 200)
    return () => clearTimeout(t)
  }, [vibes, types, budget, submitted, router])

  /* Lists for filters */
  const dataVibes = useMemo(() => {
    const s = new Set<string>()
    venues.forEach(v => {
      const arr = (v.vibes ?? v.vibe ?? []) as string[]
      arr.forEach(tag => tag && s.add(tag.toLowerCase()))
    })
    return Array.from(s).sort()
  }, [venues])
  const ALL_VIBES = dataVibes.length ? dataVibes : [...DEFAULT_VIBES]

  const ALL_TYPES = useMemo(() => {
    const s = new Set<string>()
    venues.forEach(v => v.type && s.add(v.type))
    const arr = Array.from(s)
    return arr.length ? arr : ['Cafe', 'Bar', 'Restaurant']
  }, [venues])

  /* Helpers */
  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  const getImage = (v: Venue) => normalizeImageUrl(v.image || v.imageUrl || '')

  const getMapUrl = (v: Venue) =>
    v.map_url ||
    v.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      v.address || v.location || (v.name + ' ' + (v.city || ''))
    )}`

  /* Ranking */
  const results = useMemo(() => {
    const score = (venue: Venue) => {
      const rawVibes = (venue.vibes ?? venue.vibe ?? []) as string[]
      const vSet = new Set(rawVibes.map(v => v.toLowerCase()))
      const vibeMatches = vibes.reduce((a, v) => a + (vSet.has(v) ? 1 : 0), 0)
      const vibeScore = Math.min(1, vibeMatches / 2)
      const typeScore = types.length === 0 ? 0.5 : (types.includes(venue.type) ? 1 : 0)
      const budgetOK = typeof venue.price_avg === 'number' ? (venue.price_avg <= budget ? 1 : 0) : 1
      return +(0.6 * vibeScore + 0.25 * typeScore + 0.15 * budgetOK).toFixed(2)
    }
    return venues
      .map(v => ({ v, s: score(v) }))
      .filter(x => x.s >= 0.4)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
  }, [venues, vibes, types, budget])

  /* Splash (only splash; old waitlist bar is gone) */
  if (showSplash) return <SplashWaitlist onComplete={() => setShowSplash(false)} />

  /* UI */
  return (
    <main className="container pb-16 pt-[env(safe-area-inset-top)] px-3 sm:px-4">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <motion.div layout className="card md:col-span-1">
          <h2 className="text-lg font-semibold mb-3">Your vibe</h2>

          {/* Vibes */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_VIBES.map(v => {
              const active = vibes.includes(v)
              return (
                <button
                  key={v}
                  onClick={() => setVibes(prev => toggle(prev, v))}
                  className={`chip ${active ? 'chip-active' : ''}`}
                  aria-pressed={active}
                  role="switch"
                >
                  {v}
                </button>
              )
            })}
          </div>

          {/* Budget */}
          <div className="mb-4">
            <label className="block text-sm text-subtext mb-1">Budget (max per person, $)</label>
            <input
              type="range"
              min={5}
              max={100}
              value={budget}
              onChange={e => setBudget(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-sm mt-1">${budget}</div>
          </div>

          {/* Types */}
          <div className="mb-4">
            <label className="block text-sm text-subtext mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map(t => {
                const active = types.includes(t)
                return (
                  <button
                    key={t}
                    onClick={() => setTypes(prev => toggle(prev, t))}
                    className={`chip ${active ? 'chip-active' : ''}`}
                    aria-pressed={active}
                    role="switch"
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <button onClick={() => setSubmitted(true)} className="btn btn-primary w-full md:w-auto">
            <Sparkles size={16} /> Show my hidden gems
          </button>

          {/* Debug / status */}
          <div className="mt-3 text-xs text-subtext/70">
            {loadError ? <span className="text-red-400">{loadError}</span> : <>Loaded venues: {venues.length}</>}
          </div>
        </motion.div>

        <motion.div layout className="card md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Hidden Gems Near You</h2>
            <span className="badge">{submitted ? results.length : 0} picks</span>
          </div>

          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {submitted ? (
                results.length ? (
                  results.map(({ v, s }) => {
                    const img = getImage(v)
                    const tags = ((v.vibes ?? v.vibe ?? []) as string[]).slice(0, 3)
                    const price = typeof v.price_avg === 'number' ? `$${v.price_avg}` : (v.budget || '')
                    const subtitle = [v.type, price].filter(Boolean).join(' • ')

                    return (
                      <motion.article
                        key={v.venue_id || v.name}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="relative overflow-hidden rounded-2xl border border-border"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {img ? (
                            <img
                              src={img}
                              alt={v.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement
                                if (!el.dataset.fallback) {
                                  el.dataset.fallback = '1'
                                  const noScheme = (el.src || '').replace(/^https?:\/\//i, '')
                                  el.src = `https://images.weserv.nl/?url=${encodeURIComponent(noScheme)}&w=1200&h=800&fit=cover&we`
                                } else {
                                  el.style.display = 'none'
                                  const parent = el.parentElement
                                  if (parent) parent.innerHTML = `<div class="w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(58,108,244,0.15),transparent_60%)]"></div>`
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(58,108,244,0.15),transparent_60%)]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent" />
                        </div>

                        <div className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold">{v.name}</h3>
                            <span className="badge">Score {s}</span>
                          </div>
                          <div className="text-sm text-subtext mt-1">{subtitle}</div>
                          <div className="text-sm text-subtext">{v.address || v.location}</div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {tags.map(tag => (
                              <span key={tag} className="badge">{tag}</span>
                            ))}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <a className="btn" href={getMapUrl(v)} target="_blank" rel="noopener">
                              <MapPin size={16} /> Map
                            </a>
                            <SaveButton id={(v.venue_id || v.name).toString()} />
                          </div>
                        </div>
                      </motion.article>
                    )
                  })
                ) : (
                  <div className="opacity-60 text-subtext">
                    No matches yet — try different vibes or increase your budget.
                  </div>
                )
              ) : (
                <div className="opacity-60 text-subtext">
                  Pick a few vibes and tap “Show my hidden gems”.
                </div>
              )}
            </div>
          </AnimatePresence>
        </motion.div>

      </section>
    </main>
  )
}

/* ------------- Suspense wrapper for useSearchParams ------------- */
export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-400">Loading…</div>}>
      <PageContent />
    </Suspense>
  )
}

/* ---------------- Save button (toggle on/off) ---------------- */
function SaveButton({ id }: { id: string }) {
  const [saved, setSaved] = useState<boolean>(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const s = new Set<string>(JSON.parse(localStorage.getItem('mysterymapp_saved') || '[]'))
      setSaved(s.has(id))
    }
  }, [id])

  return (
    <button
      onClick={() => {
        if (typeof window === 'undefined') return
        const arr: string[] = JSON.parse(localStorage.getItem('mysterymapp_saved') || '[]')
        const s = new Set(arr)
        if (s.has(id)) { s.delete(id); setSaved(false) } else { s.add(id); setSaved(true) }
        localStorage.setItem('mysterymapp_saved', JSON.stringify([...s]))
      }}
      className={`btn ${saved ? '' : 'btn-primary'}`}
      aria-pressed={saved}
      role="switch"
    >
      {saved ? 'Saved ✓' : 'Save'}
    </button>
  )
}
