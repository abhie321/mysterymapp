import type { Metadata } from "next"
import "./globals.css"
import Image from "next/image"

export const metadata: Metadata = {
  title: "MysteryMapp — Hidden Gems Near You",
  description: "Discover hidden gems that match your vibe — instantly.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="container py-8 flex items-center gap-3">
          <Image src="/logo.svg" alt="MysteryMapp" width={40} height={40} className="rounded-xl shadow-glow"/>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MysteryMapp <span className="text-subtext text-base align-super">alpha</span></h1>
            <p className="text-subtext">Discover hidden gems that match your vibe — instantly.</p>
          </div>
        </header>
        {children}
        <footer className="container py-8 text-sm text-subtext">Alpha build for testing — feedback welcome.</footer>
      </body>
    </html>
  )
}
