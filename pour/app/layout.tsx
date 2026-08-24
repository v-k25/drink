import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope, Newsreader } from 'next/font/google'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mywebsite.in'),
  title: {
    default: 'Drink — Find your sip in Jaipur',
    template: '%s | Drink Jaipur',
  },
  description:
    'A Jaipur-first, drink-first nightlife companion matching taste, mood, occasion and budget with alcoholic and 0% recommendations.',
  generator: 'v0.app',
  keywords: ['drink recommendation Jaipur', 'Find My Sip', 'Jaipur nightlife guide', 'mocktails Jaipur', '0% drinks Jaipur'],
  openGraph: {
    title: 'Drink — Find your sip in Jaipur',
    description: 'A better answer to what you should drink tonight — alcoholic or 0%.',
    type: 'website',
    locale: 'en_IN',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F0E8D8',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`bg-background ${newsreader.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
