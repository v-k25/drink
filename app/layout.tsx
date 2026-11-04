import './globals.css'
import './tokens.css'
import './ui.css'
import type { Metadata, Viewport } from 'next'
import { LoadingScreen } from './logo'

export const metadata: Metadata = { title: 'Socifer | Jaipur nights, booked', description: 'Find your drink and plan your party. Coming first to Jaipur.', robots: { index: false, follow: false } }
// Black Tie is dark on every page: the browser bar and built-in controls match the black ground.
export const viewport: Viewport = { themeColor: '#0a0a0b', colorScheme: 'dark' }

const introScript = "try{if(!sessionStorage.getItem('sf-intro')){document.documentElement.classList.add('sf-intro-on');sessionStorage.setItem('sf-intro','1')}}catch(e){}"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the intro script below may add a class to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Once-per-visit intro: on the first page opened in a browser tab session, the loading screen shows over the page
            briefly, then closes into a circle and reveals the page (CSS only, .sf-intro in ui.css), while the page loads underneath. Under reduced motion
            it fades out instead. Without JavaScript the class is never added, so the overlay never shows. */}
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <div className="sf-intro" aria-hidden="true"><LoadingScreen /></div>
        {children}
      </body>
    </html>
  )
}
