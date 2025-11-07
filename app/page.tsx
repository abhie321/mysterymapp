'use client'

import { Suspense, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { MapPin, Sparkles, SlidersHorizontal } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

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

const DEFAULT_VIBES = ["cozy","indie","quiet","vibrant","romantic","retro","artsy","hidden","minimalist","aesthetic","late-night","views","casual"] as const;
const SHEET_CSV = process.env.NEXT_PUBLIC_SHEET_CSV

/** ---------------- CSV helpers (for Google Sheets publish-to-web CSV) ---------------- **/

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = ['']
  let col = 0
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') { row[col] += '"'; i++; continue }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) { row.push(''); col++; continue }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i+1] === '\n') i++
      rows.push(row); row = ['']; col = 0; continue
    }
    row[col] += ch
  }
  if (row.some(cell => cell !== '')) rows.push(row)

  const header = (rows.shift() ?? []).map(h => h.trim())
  return rows
    .filter(r => r.some(c => c && c.trim()))
    .map(r => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])))
}

function rowToVenue(r: Record<string,string>): Venue {
  const vibes = (r.vibes || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const price_avg = r.price_avg ? Number(r.price_avg) : undefined

  return {
    name: r.name,
    type: r.type,
    vibes,
    budget: r.budget,
    address: r.address,
    location: r.location,
    city: r.city,
    price_avg,
    imageUrl: r.imageUrl,
    mapUrl: r.mapUrl,
  }
}

/** -------------------------------- Page -------------------------------- **/

export default function Page() {
  return (
    <Suspense fallback={<main className="container py-12 text-subtext">Loading…</main>}>
      <PageContent />
    </Suspense>
  )
}

function PageContent() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // filters / state
  const [vibes, setVibes] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [budget, setBudget] = useState<number>(25)
  const [submitted, setSubmitted] = useState(false)

  // mobile-only: collapsible filters
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const reduceMotion = useReducedMotion()

  // Load data (Google Sheet CSV if set, else local JSON)
  useEffect(() => {
    ;(async () => {
      try {
        if (SHEET_CSV) {
          const r = await fetch(`${SHEET_CSV}${SHEET_CSV.includes('?') ? '&' : '?'}cb=${Date.now()}`, { cache: 'no-store' })
          const text = await r.text()
          const rows = parseCSV(text)
          const parsed = rows.map(rowToVenue).filter(v => v.name && v.type)
          setVenues(parsed)
        } else {
          const r = await fetch("/data/venues.json", { cache: 'no-store' })
          const j = await r.json()
          setVenues(j)
        }
      } finally {
        setLoadingData(false)
      }
    })()
  }, [])

  // Read initial state from URL (once)
  useEffect(() => {
    const v = searchParams.get("v")?.split(",").filter(Boolean) ?? []
    const t = searchParams.get("t")?.split("|").filter(Boolean) ?? []
    const b = Number(searchParams.get("b"))
    const go = searchParams.get("go") === "1"
    if (v.length) setVibes(v)
    if (t.length) setTypes(t)
    if (!Number.isNaN(b) && b > 0) setBudget(b)
    if (go) setSubmitted(true)

    // default mobile: keep filters collapsed
    if (typeof window !== 'undefined' && window.innerWidth < 768) setFiltersOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep URL in sync with state
  useEffect(() => {
    const params = new URLSearchParams()
    if (vibes.length) params.set("v", vibes.join(","))
    if (types.length) params.set("t", types.join("|"))
    if (budget) params.set("b", String(budget))
    if (submitted) params.set("go", "1")
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : "/", { scroll: false })
  }, [vibes, types, budget, submitted, router])

  // Build available vibes from dataset (fallback to defaults)
  const dataVibes = useMemo(() => {
    const s = new Set<string>()
    venues.forEach(v => {
      const arr = (v.vibes ?? v.vibe ?? []) as string[]
      arr.forEach(tag => tag && s.add(tag.toLowerCase()))
    })
    return Array.from(s).sort()
  }, [venues])
  const ALL_VIBES = dataVibes.length ? dataVibes : [...DEFAULT_VIBES]

  // Build types from dataset (fallback to Cafe/Bar/Restaurant)
  const ALL_TYPES = useMemo(() => {
    const s = new Set<string>()
    venues.forEach(v => v.type && s.add(v.type))
    const arr = Array.from(s)
    return arr.length ? arr : ["Cafe","Bar","Restaurant"]
  }, [venues])

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  const getImage = (v: Venue) => v.image || v.imageUrl
  const getMapUrl = (v: Venue) =>
    v.map_url ||
    v.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address || v.location || (v.name + " " + (v.city || "")))}`

  const results = useMemo(() => {
    const score = (venue: Venue) => {
      const rawVibes = (venue.vibes ?? venue.vibe ?? []) as string[]
      const vSet = new Set(rawVibes.map(v => v.toLowerCase()))
      const vibeMatches = vibes.reduce((a, v) => a + (vSet.has(v) ? 1 : 0), 0)
      const vibeScore = Math.min(1, vibeMatches / 2)
      const typeScore = types.length === 0 ? 0.5 : (types.includes(venue.type) ? 1 : 0)
      const budgetOK = typeof venue.price_avg === "number" ? (venue.price_avg <= budget ? 1 : 0) : 1
      return +(0.6 * vibeScore + 0.25 * typeScore + 0.15 * budgetOK).toFixed(2)
    }

    return venues
      .map(v => ({ v, s: score(v) }))
      .filter(x => x.s >= 0.4)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
  }, [venues, vibes, types, budget])

  // Anim presets honoring reduced motion
  const motionInitial = reduceMotion ? {} : { opacity: 0, y: 10 }
  const motionAnimate = reduceMotion ? {} : { opacity: 1, y: 0 }
  const motionExit = reduceMotion ? {} : { opacity: 0, y: -10 }
  const motionTransition = { duration: reduceMotion ? 0 : 0.25 }

  return (
    <main className="container pb-16 ios-smooth">
      {/* Mobile filters toggle */}
      <div className="md:hidden flex items-center justify-between mb-2">
        <button
          className="btn"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          aria-controls="filters"
        >
          <SlidersHorizontal size={16} /> {filtersOpen ? "Hide filters" : "Show filters"}
        </button>
        {submitted ? <span className="badge">{results.length} picks</span> : null}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left controls (collapsible on mobile) */}
        <motion.div
          id="filters"
          layout
          className={`card md:col-span-1 ${filtersOpen ? '' : 'md:block hidden'}`}
        >
          <h2 className="text-lg font-semibold mb-3">Your vibe</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_VIBES.map(v => (
              <button
                key={v}
                onClick={() => setVibes(prev => toggle(prev, v))}
                className={`chip ${vibes.includes(v) ? "chip-active" : ""}`}
              >
                {v}
              </button>
            ))}
          </div>

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

          <div className="mb-4">
            <label className="block text-sm text-subtext mb-1">Type</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypes(prev => toggle(prev, t))}
                  className={`chip ${types.includes(t) ? "chip-active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setSubmitted(true)} className="btn btn-primary w-full md:w-auto">
            <Sparkles size={16} /> Show my hidden gems
          </button>
        </motion.div>

        {/* Results */}
        <motion.div layout className="card md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Hidden Gems Near You</h2>
            <div className="hidden md:flex items-center gap-2">
              <span className="badge">{submitted ? results.length : 0} picks</span>
              <ShareButton />
            </div>
            {/* On mobile, Share lives at the bottom via system share */}
          </div>

          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Skeletons while loading */}
              {submitted && loadingData && Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={`sk-${i}`} />
              ))}

              {/* Real results */}
              {submitted && !loadingData ? results.map(({ v, s }) => {
                const img = getImage(v)
                const tags = ((v.vibes ?? v.vibe ?? []) as string[]).slice(0, 3)
                const price = typeof v.price_avg === "number" ? `$${v.price_avg}` : (v.budget || "")
                const subtitle = [v.type, price].filter(Boolean).join(" • ")

                return (
                  <motion.article
                    key={v.venue_id || v.name}
                    layout
                    initial={motionInitial}
                    animate={motionAnimate}
                    exit={motionExit}
                    transition={motionTransition}
                    whileHover={reduceMotion ? {} : { y: -4 }}
                    className="group relative overflow-hidden rounded-2xl border border-border will-change-transform"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {img ? (
                        <ImageWithBlur src={img} alt={v.name} />
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
              }) : null}

              {!submitted && !loadingData && (
                <div className="opacity-60 text-subtext">Pick a few vibes and tap “Show my hidden gems”.</div>
              )}
            </div>

            {/* Mobile share button (system share) */}
            {submitted && !loadingData && (
              <div className="md:hidden flex justify-end mt-4">
                <ShareButton mobile />
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Mobile sticky CTA */}
      {!submitted && (
        <StickyMobileCTA onClick={() => setSubmitted(true)} />
      )}
    </main>
  )
}

/** ---------------- UI bits ---------------- **/

function SaveButton({ id }: { id: string }) {
  const [saved, setSaved] = useState<boolean>(false)
  useEffect(() => {
    const s = new Set<string>(JSON.parse(localStorage.getItem("mysterymapp_saved") || "[]"))
    setSaved(s.has(id))
  }, [id])
  return (
    <button
      onClick={() => {
        const s = new Set<string>(JSON.parse(localStorage.getItem("mysterymapp_saved") || "[]"))
        s.add(id); localStorage.setItem("mysterymapp_saved", JSON.stringify([...s]))
        setSaved(true)
      }}
      className={`btn ${saved ? "" : "btn-primary"}`}
      aria-pressed={saved}
    >
      {saved ? "Saved ✓" : "Save"}
    </button>
  )
}

function ShareButton({ mobile = false }: { mobile?: boolean }) {
  const [ok, setOk] = useState(false)
  const label = mobile ? "Share results" : (ok ? "Copied ✓" : "Share")

  async function doShare() {
    const url = window.location.href
    // Prefer native share on iOS/Android
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "MysteryMapp", text: "My hidden gems" })
        return
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch {
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setOk(true); setTimeout(() => setOk(false), 1500)
    }
  }

  return (
    <button className="btn" onClick={doShare} title="Share these results">
      {label}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="relative aspect-[16/10] bg-border animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-1/2 bg-border animate-pulse rounded" />
        <div className="h-3 w-1/3 bg-border animate-pulse rounded" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-14 bg-border animate-pulse rounded-full" />
          <div className="h-5 w-16 bg-border animate-pulse rounded-full" />
        </div>
        <div className="h-8 w-24 bg-border animate-pulse rounded-xl mt-3" />
      </div>
    </div>
  )
}

function ImageWithBlur({ src, alt }: { src: string, alt: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      sizes="(max-width: 640px) 100vw, 50vw"
      className={`w-full h-full object-cover transition-transform duration-300 ${loaded ? 'blur-0' : 'blur-sm'} group-hover:scale-[1.02]`}
    />
  )
}

function StickyMobileCTA({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-[#0e1018]/95 border-t border-border/70 backdrop-blur safe-pb">
      <div className="container py-2">
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full btn btn-primary text-base"
          aria-label="Show my hidden gems"
        >
          <Sparkles size={16} /> Show my hidden gems
        </button>
      </div>
    </div>
  )
}
