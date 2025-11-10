// app/layout.tsx
import '../styles/globals.css'

export const metadata = {
  title: 'MysteryMapp',
  description: 'Discover hidden gems that match your vibe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Speed up first image fetches */}
        <link rel="preconnect" href="https://images.weserv.nl" />
        <link rel="preconnect" href="https://drive.google.com" />
      </head>
      <body>{children}</body>
    </html>
  )
}
