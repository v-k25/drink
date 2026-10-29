// Test-only preload. All upstream traffic is denied except the isolated in-memory mock.
// Maintained fixtures; runtime mock-audit.json stays in tmp/design-polish/.
require('./mock-supabase.cjs')
const fs = require('node:fs')
const path = require('node:path')
const evidenceDir = path.resolve(__dirname, '..', '..', '..', 'tmp', 'design-polish')
fs.mkdirSync(evidenceDir, { recursive: true })
const mockedFetch = global.fetch
const MOCK_ORIGIN = process.env.SUPABASE_URL + '/'
const audit = { writes: 0, blocked: 0 }
global.fetch = async (url, options = {}) => {
  const address = String(url)
  if (!address.startsWith(MOCK_ORIGIN)) {
    audit.blocked++
    fs.writeFileSync(path.join(evidenceDir, 'mock-audit.json'), JSON.stringify(audit))
    throw new Error('External network blocked by design-polish test')
  }
  if (['POST', 'PATCH', 'DELETE'].includes(options.method)) audit.writes++
  fs.writeFileSync(path.join(evidenceDir, 'mock-audit.json'), JSON.stringify(audit))
  return mockedFetch(url, options)
}
