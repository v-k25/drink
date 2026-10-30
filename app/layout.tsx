import './globals.css'
import './tokens.css'
import './ui.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'

// Nunito Sans serves the tool pages until Party Planner and Find My Drink move to the Pre-Party faces (see app/fonts.ts).
const nunitoSans = localFont({
  src: './fonts/NunitoSans-latin.woff2',
  weight: '400 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-nunito-sans',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const metadata: Metadata = { title: 'Socifer — Good Times Start Here', description: 'Find your drink and plan your party. Coming first to Jaipur.', robots: { index: false, follow: false } }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body>{children}</body>
    </html>
  )
}
