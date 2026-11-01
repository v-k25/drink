import './globals.css'
import './tokens.css'
import './ui.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = { title: 'Socifer | Jaipur nights, booked', description: 'Find your drink and plan your party. Coming first to Jaipur.', robots: { index: false, follow: false } }
// Black Tie is dark on every page: the browser bar and built-in controls match the black ground.
export const viewport: Viewport = { themeColor: '#0a0a0b', colorScheme: 'dark' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
