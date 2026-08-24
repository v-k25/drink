import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'Drink — What should I drink tonight? | Launching first in Jaipur',
  description:
    'A smarter way to decide what you are drinking tonight. Find My Sip matches your taste, mood, occasion and budget to your perfect drink — alcoholic or 0%. Launching first in Jaipur.',
  generator: 'v0.app',
  keywords: [
    'drink recommendation',
    'Find My Sip',
    'Jaipur nightlife',
    'mocktails Jaipur',
    'party planner drinks',
    '0% drinks',
  ],
  openGraph: {
    title: 'Drink — What should I drink tonight?',
    description:
      'Personalized drink matching for taste, mood, occasion and budget. Launching first in Jaipur.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0D0B0E',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`bg-background ${fraunces.variable} ${geist.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
