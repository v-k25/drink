import localFont from 'next/font/local'

// Pre-Party faces. A themed page (data-theme) puts `${bricolage.variable} ${manrope.variable}` on its root element;
// tokens.css maps --font-display and --font-text to these variables. Importing this file from a page is what makes
// next/font preload the files on that route only. Nunito Sans stays in app/layout.tsx until the tool pages are redesigned.
export const bricolage = localFont({
  src: './fonts/BricolageGrotesque-latin.woff2',
  weight: '700 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-bricolage',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const manrope = localFont({
  src: './fonts/Manrope-latin.woff2',
  weight: '500 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-manrope',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
  adjustFontFallback: 'Arial',
})
