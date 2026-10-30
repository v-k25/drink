import './globals.css'
import './tokens.css'
import './ui.css'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Socifer — Good Times Start Here', description: 'Find your drink and plan your party. Coming first to Jaipur.', robots: { index: false, follow: false } }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
