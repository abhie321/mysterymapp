'use client'

import { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

export default function SplashWaitlist({ onComplete }: { onComplete?: () => void }) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    // Save locally so user doesn’t see splash again
    localStorage.setItem("waitlistEmail", email)

    try {
      await fetch(
        "https://docs.google.com/forms/d/e/1FAIpQLSct2sJKnNJ10_IlYM9efpzE4-E6nuwEhIVoGxLbLk72OJeh8Q/formResponse",
        {
          method: "POST",
          mode: "no-cors",
          body: new URLSearchParams({ "entry.542067079": email }), // your Google Form entry ID
        }
      )
    } catch (err) {
      console.error("Waitlist submission failed:", err)
    }

    setSubmitted(true)

    // Tell parent that splash is done
    if (onComplete) onComplete()
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-indigo-950 via-black to-neutral-900 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="max-w-md mx-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-4xl font-bold mb-4">Welcome to MysteryMapp ✨</h1>
        <p className="text-lg text-gray-300 mb-8">
          Discover hidden gems near you. Be among the first to explore the beta.
        </p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400 text-lg font-medium"
          >
            You’re on the list! 🚀
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full sm:w-auto flex-grow px-4 py-2 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400 text-white"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition font-medium"
            >
              <Sparkles size={16} />
              Join Waitlist
            </button>
          </form>
        )}
      </motion.div>

      <motion.footer
        className="absolute bottom-6 text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Built with ❤️ by MysteryMapp
      </motion.footer>
    </motion.div>
  )
}
