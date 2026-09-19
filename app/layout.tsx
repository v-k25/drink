import './globals.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'

const nunitoSans = localFont({
  src: './fonts/NunitoSans-variable.ttf',
  weight: '400 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-nunito-sans',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const metadata: Metadata = { title: 'AllCheers — Good Times Start Here', description: 'Find your drink and plan your party. Coming first to Jaipur.', robots: { index: false, follow: false } }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body>{children}</body>
    </html>
  )
}
