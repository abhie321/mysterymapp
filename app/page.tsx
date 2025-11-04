'use client'

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Sparkles } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

type Venue = {
  venue_id?: string
  name: string
  type: string
  city?: string
  price_avg?: number          // legacy numeric budget
  budget?: string             // "$", "$$", "$$$"
  vibes?: string[]            // plural
  vibe?: string[]             // singular (fallback)
  address?: string
  location?: string
  map_url?: string
  mapUrl?: string
  image?: string
  imageUrl?: string
}

const DEFAULT_VIBES = ["cozy","indie","quiet","vibrant","romantic","retro","artsy","hidden","minimalist","aesthetic","late-night","views","casual"] as const;

export default function Page() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [vibes, setVibes] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [budget, setBudget] = useState<number>(25)
  const [submitted, setSubmitted] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Load data
  useEffect(() => {
    fetch("/data/venues.json").then(r => r.json()).then(setVenues)
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
      const vibeScore = Math.min(1, vibeMatches / 2) // up to 1.0

      const typeScore = types.length === 0 ? 0.5 : (types.includes(venue.type) ? 1 : 0)

      // If numeric price_avg isn't present, treat as OK
      const budgetOK = typeof venue.price_avg === "number" ? (venue.price_avg <= budget ? 1 : 0) : 1

      return +(0.6 * vibeScore + 0.25 * typeScore + 0.15 * budgetOK).toFixed(2)
    }

    return venues
      .map(v => ({ v, s: score(v) }))
      .filter(x => x.s >= 0.4)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
  }, [venues, vibes, types, budget])

  return (
    <main className="container pb-16">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left controls */}
        <motion.div layout className="card md:col-span-1">
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

          <button onClick={() => setSubmitted(true)} className="btn btn-primary">
            <Sparkles size={16} /> Show my hidden gems
          </button>
        </motion.div>

        {/* Results */}
        <motion.div layout className="card md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Hidden Gems Near You</h2>
            <div className="flex items-center gap-2">
              <span className="badge">{submitted ? results.length : 0} picks</span>
              <ShareButton />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {submitted ? results.map(({ v, s }) => {
                const img = getImage(v)
                const tags = ((v.vibes ?? v.vibe ?? []) as string[]).slice(0, 3)
                const price = typeof v.price_avg === "number" ? `$${v.price_avg}` : (v.budget || "")
                const subtitle = [v.type, price].filter(Boolean).join(" • ")

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
                        <img src={img} alt={v.name} className="w-full h-full object-cover" />
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
              }) : (
                <div className="opacity-60 text-subtext">Pick a few vibes and tap “Show my hidden gems”.</div>
              )}
            </div>
          </AnimatePresence>
        </motion.div>
      </section>
    </main>
  )
}

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
    >
      {saved ? "Saved ✓" : "Save"}
    </button>
  )
}

function ShareButton() {
  const [ok, setOk] = useState(false)
  return (
    <button
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          setOk(true)
          setTimeout(() => setOk(false), 1500)
        } catch {
          const input = document.createElement("input")
          input.value = window.location.href
          document.body.appendChild(input); input.select()
          document.execCommand("copy"); document.body.removeChild(input)
          setOk(true); setTimeout(() => setOk(false), 1500)
        }
      }}
      title="Copy a link to these results"
    >
      {ok ? "Copied ✓" : "Share"}
    </button>
  )
}
