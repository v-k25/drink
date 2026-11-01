import localFont from 'next/font/local'

// Black Tie faces. A themed page (data-theme) puts `${archivo.variable} ${manrope.variable}` on its root element;
// tokens.css maps --font-display and --font-text to these variables. Importing this file from a page is what makes
// next/font preload the files on that route only.
// Archivo is pinned to its widest width (wdth 125), weights 700-800, Latin plus ₹ (subset with fontTools).
export const archivo = localFont({
  src: './fonts/Archivo-latin.woff2',
  weight: '700 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-archivo',
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
