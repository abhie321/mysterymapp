'use client'

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Sparkles } from "lucide-react"

type Venue = {
  venue_id: string
  name: string
  type: "Cafe" | "Bar" | "Restaurant"
  city: string
  price_avg: number
  vibes: string[]
  address: string
  map_url: string
  image?: string
}

const ALL_VIBES = ["cozy","indie","quiet","vibrant","romantic","retro","artsy","hidden","minimalist","aesthetic","late-night","views","casual"] as const;
const ALL_TYPES = ["Cafe","Bar","Restaurant"] as const;

export default function Page() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [vibes, setVibes] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [budget, setBudget] = useState<number>(25)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch("/data/venues.json").then(r => r.json()).then(setVenues)
  }, [])

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  const results = useMemo(() => {
    const score = (venue: Venue) => {
      const vSet = new Set(venue.vibes.map(v => v.toLowerCase()))
      const vibeMatches = vibes.reduce((a,v) => a + (vSet.has(v) ? 1 : 0), 0)
      const vibeScore = Math.min(1, vibeMatches / 2)
      const typeScore = types.length === 0 ? 0.5 : (types.includes(venue.type) ? 1 : 0)
      const budgetOK = venue.price_avg <= budget ? 1 : 0
      return +(0.6*vibeScore + 0.25*typeScore + 0.15*budgetOK).toFixed(2)
    }
    return venues
      .map(v => ({ v, s: score(v) }))
      .filter(x => x.s >= 0.4)
      .sort((a,b) => b.s - a.s)
      .slice(0, 6)
  }, [venues, vibes, types, budget])

  return (
    <main className="container pb-16">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <input type="range" min={5} max={100} value={budget}
              onChange={e => setBudget(parseInt(e.target.value))}
              className="w-full" />
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
            <Sparkles size={16}/> Show my hidden gems
          </button>
        </motion.div>

        <motion.div layout className="card md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Hidden Gems Near You</h2>
            <span className="badge">{results.length} picks</span>
          </div>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {submitted ? results.map(({v, s}) => (
                <motion.article
                  key={v.venue_id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="relative overflow-hidden rounded-2xl border border-border"
                >
                  <div className="relative aspect-[16/10] bg-[radial-gradient(circle_at_30%_30%,rgba(58,108,244,0.15),transparent_60%)]"></div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{v.name}</h3>
                      <span className="badge">Score {s}</span>
                    </div>
                    <div className="text-sm text-subtext mt-1">{v.type} • ${v.price_avg}</div>
                    <div className="text-sm text-subtext">{v.address}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {v.vibes.slice(0,3).map(tag => (
                        <span key={tag} className="badge">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a className="btn" href={v.map_url} target="_blank" rel="noopener">
                        <MapPin size={16}/> Map
                      </a>
                      <SaveButton id={v.venue_id}/>
                    </div>
                  </div>
                </motion.article>
              )) : (
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
