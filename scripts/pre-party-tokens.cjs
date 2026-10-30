// Pre-Party design tokens: generate app/tokens.css from docs/design/pre-party/tokens.json, or check it.
//   node scripts/pre-party-tokens.cjs --write   regenerate app/tokens.css
//   node scripts/pre-party-tokens.cjs --check   fail if app/tokens.css drifted, or if a text/border pair misses WCAG AA
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'docs', 'design', 'pre-party', 'tokens.json')
const target = path.join(root, 'app', 'tokens.css')
const tokens = JSON.parse(fs.readFileSync(source, 'utf8'))
const themes = tokens.color.themes.map(theme => theme.id) // landing, tools, tools-dark
const [landing, tools, toolsDark] = themes

const resolve = (value, theme) => {
  const raw = typeof value === 'string' ? value : (value[theme] ?? value[themes[0]])
  return raw.startsWith('{') ? `var(--${raw.slice(1, -1)})` : raw
}
const declare = (theme, indent = '  ') => [...tokens.color.tokens, ...tokens.shadow.tokens]
  .map(token => `${indent}--${token.name}: ${resolve(token.value, theme)};`).join('\n')

// next/font exposes each face as a variable on <html>; the first family in tokens.json maps to it.
const fontVar = { 'Bricolage Grotesque': 'var(--font-bricolage)', Manrope: 'var(--font-manrope)' }
const family = stack => stack.replace(/^"([^"]+)"/, (match, name) => fontVar[name] || match)

function build() {
  const lines = []
  lines.push('/* Generated from docs/design/pre-party/tokens.json by scripts/pre-party-tokens.cjs. Do not edit by hand.')
  lines.push('   Themes: landing (always dark), tools (light, dark under prefers-color-scheme), tools-dark (forced dark).')
  lines.push('   Nothing here applies until a page sets data-theme; the pre-redesign pages do not. */')
  lines.push(`[data-theme="${landing}"] {\n  color-scheme: dark;\n${declare(landing)}\n}`)
  lines.push(`[data-theme="${tools}"] {\n  color-scheme: light;\n${declare(tools)}\n}`)
  lines.push(`@media (prefers-color-scheme: dark) {\n  [data-theme="${tools}"] {\n    color-scheme: dark;\n${declare(toolsDark, '    ')}\n  }\n}`)
  lines.push(`[data-theme="${toolsDark}"] {\n  color-scheme: dark;\n${declare(toolsDark)}\n}`)
  lines.push(`/* Print is always the light tools theme: black on white. */\n@media print {\n  [data-theme="${landing}"], [data-theme="${tools}"], [data-theme="${toolsDark}"] {\n    color-scheme: light;\n${declare(tools, '    ')}\n  }\n}`)
  const plain = ['spacing', 'radius', 'size'].flatMap(group => tokens[group].tokens.map(token => `  --${token.name}: ${token.value};`))
  lines.push(`:root {\n${plain.join('\n')}\n}`)
  // Font stacks sit on [data-theme], not :root: --font-bricolage and --font-manrope come from next/font classes that a themed
  // page applies on the same element (see app/fonts.ts), so only pages that use the fonts load them.
  const fonts = Object.entries(tokens.type.families).map(([key, stack]) => `  --font-${key}: ${family(stack)};`)
  lines.push(`[data-theme] {\n${fonts.join('\n')}\n}`)
  return lines.join('\n') + '\n'
}

// WCAG 2 contrast
const luminance = hex => {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const byName = Object.fromEntries(tokens.color.tokens.map(token => [token.name, token.value]))
const colour = (name, theme) => {
  const raw = typeof byName[name] === 'string' ? byName[name] : (byName[name][theme] ?? byName[name][themes[0]])
  return raw.startsWith('{') ? colour(raw.slice(1, -1), theme) : raw.slice(0, 7)
}
const pairs = [
  [4.5, 'text', ['bg', 'surface', 'surface-raised']], [4.5, 'text-muted', ['bg', 'surface', 'surface-raised']],
  [4.5, 'accent-text', ['bg', 'surface', 'surface-raised']], [4.5, 'on-accent', ['accent']], [4.5, 'on-highlight', ['highlight']],
  [4.5, 'text', ['highlight-quiet']], [4.5, 'on-city', ['city']], [4.5, 'on-bar', ['bar']], [4.5, 'on-bar-muted', ['bar']],
  [4.5, 'success', ['bg', 'surface', 'surface-raised']], [4.5, 'warning', ['bg', 'surface', 'surface-raised']], [4.5, 'error', ['bg', 'surface', 'surface-raised']],
  [3, 'line-strong', ['bg', 'surface']], [3, 'focus', ['bg', 'surface', 'surface-raised']], [3, 'highlight', ['bar']],
]
// `city` is only used on the landing page, so it is only checked there.
const cityPairs = [[4.5, 'city', ['bg', 'surface']]]

function contrastFailures() {
  const failures = []
  for (const theme of themes) {
    for (const [min, fg, backgrounds] of [...pairs, ...(theme === landing ? cityPairs : [])]) {
      for (const bg of backgrounds) {
        const value = ratio(colour(fg, theme), colour(bg, theme))
        if (value < min) failures.push(`${theme}: ${fg} on ${bg} is ${value.toFixed(2)}:1, needs ${min}:1`)
      }
    }
  }
  return failures
}

const css = build()
if (process.argv.includes('--write')) {
  fs.writeFileSync(target, css)
  console.log(`wrote ${path.relative(root, target)} (${css.length} bytes)`)
} else if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : ''
  const failures = contrastFailures()
  if (current !== css) failures.unshift('app/tokens.css is out of date: run node scripts/pre-party-tokens.cjs --write')
  if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
  console.log(`tokens ok: app/tokens.css matches tokens.json; ${themes.length} themes, all text and border pairs pass AA`)
} else {
  console.error('usage: node scripts/pre-party-tokens.cjs --write | --check'); process.exit(2)
}
