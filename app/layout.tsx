// app/layout.tsx
import './styles/globals.css'

export const metadata = {
  title: 'MysteryMapp',
  description: 'Discover hidden gems that match your vibe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
