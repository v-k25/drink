// Production browser regression; requires an existing Playwright installation (no installs).
// Always starts its own loopback server with a deny-by-default, in-memory upstream.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '..')
const evidence = path.join(root, 'tmp/design-polish')
const output = path.join(root, 'output/playwright/allcheers-design-polish')
const port = 3117
const origin = `http://127.0.0.1:${port}`
const preload = path.join(root, 'scripts/fixtures/design-polish/mock-upstream.cjs').replaceAll('\\', '/')
assert.ok(fs.existsSync(preload), 'Mock preload is required; never test against live persistence')
fs.mkdirSync(evidence, { recursive: true })
fs.mkdirSync(output, { recursive: true })
let server, browser, logs = ''
const errors = []
async function fits(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${page.viewportSize().width}`) }
async function shot(page, name) { await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true }) }
async function main() {
  try { await fetch(origin); throw new Error(`Port ${port} already in use; refusing to reuse or stop it`) } catch (error) { if (!error.cause) throw error }
  server = spawn('cmd.exe', ['/d', '/s', '/c', `corepack.cmd pnpm start --hostname 127.0.0.1 --port ${port}`], {
    cwd: root, env: { ...process.env, pnpm_config_verify_deps_before_run: 'warn', NODE_OPTIONS: `--require="${preload}"` }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', value => { logs += value })
  server.stderr.on('data', value => { logs += value })
  let ready = false
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin)).ok) { ready = true; break } } catch {} await new Promise(r => setTimeout(r, 250)) }
  assert.ok(ready, logs)
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 720 } })
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', async dialog => { errors.push('Unexpected window dialog: ' + dialog.message()); await dialog.dismiss() })
  const fontResponses = []
  page.on('response', response => { if (/\.(ttf|woff2?)(\?|$)/.test(response.url())) fontResponses.push({ url: response.url(), status: response.status() }) })
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(origin)
    await page.evaluate(() => document.fonts.ready)
    await fits(page)
    // Landing: one H1, waitlist-only primary CTA, "How it works" secondary CTA.
    assert.equal(await page.locator('h1').count(), 1)
    await page.getByRole('heading', { name: 'Jaipur nights, booked.', level: 1 }).waitFor()
    const hero = page.locator('section[aria-labelledby="hero-title"]')
    assert.equal(await hero.getByRole('link', { name: 'Join the list', exact: true }).getAttribute('href'), '#early-access')
    assert.equal(await hero.getByRole('link', { name: 'How it works', exact: true }).getAttribute('href'), '#how-it-works')
    assert.equal(await hero.getByRole('link', { name: /book|ticket|buy/i }).count(), 0, 'pre-launch landing must not offer booking')
    await hero.getByRole('link', { name: 'How it works', exact: true }).click()
    assert.equal(new URL(page.url()).hash, '#how-it-works')
    for (const href of await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href')))) assert.ok(await page.locator(href).count(), href)
    assert.equal(await page.locator('#tools a').count(), 2, 'Party Planner and Find My Drink tool cards')
    for (const href of ['/party-planner', '/find-my-drink']) assert.equal(await page.locator(`#tools a[href="${href}"]`).count(), 1)
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/)
    const font = await page.evaluate(() => ({ family: getComputedStyle(document.querySelector('[data-theme]')).fontFamily, loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, weight: f.weight })) }))
    assert.match(font.family, /manrope/i)
    assert.ok(font.loaded.some(f => /manrope/i.test(f.family)))
    assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).animationName), 'none')
    await page.evaluate(() => scrollTo(0, 0))
    await shot(page, `home-${width}`)
  }
  assert.ok(fontResponses.some(r => r.status === 200 && r.url.startsWith(origin)))
  for (const asset of ['/icon.svg', '/favicon.ico']) {
    const response = await fetch(origin + asset); assert.equal(response.status, 200)
    const data = Buffer.from(await response.arrayBuffer())
    if (asset.endsWith('.ico')) { assert.equal(data.readUInt16LE(2), 1); assert.ok(data.readUInt16LE(4) >= 3, 'favicon.ico bundles at least three sizes') }
    else assert.match(data.toString(), /#ff2d87/) // Black Tie (BT2): pink horned O
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(origin)
  await page.locator('header nav[aria-label="Main navigation"] a[href="/party-planner"]').click()
  await page.waitForURL(url => url.pathname === '/party-planner')
  await page.getByLabel('I meet the legal drinking-age').check()
  await page.waitForFunction(() => !document.querySelector('#planner-content button')?.disabled, null, { timeout: 20000 })
  await page.getByRole('button', { name: 'Continue to planner', exact: true }).click()
  // Party Planner is one page since the tools redesign (TR5): guests and budget first, the list straight away.
  await page.getByRole('heading', { name: 'Party Planner', level: 1 }).waitFor()
  await page.getByRole('textbox', { name: 'Guests' }).fill('12')
  await page.getByRole('textbox', { name: 'Drinks budget' }).fill('5000')
  await page.locator('table').waitFor()
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await fits(page); await shot(page, `guest-list-${width}`) }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => { window.print = () => { window.__printed = true }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text } } }); Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__shared = data.text } }) })
  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  await page.getByText('List copied. Paste it into WhatsApp or notes.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Share list', exact: true }).filter({ visible: true }).click()
  await page.waitForFunction(() => !!window.__shared)
  await page.getByRole('button', { name: 'Print', exact: true }).click()
  await page.waitForFunction(() => window.__printed === true)
  assert.ok(await page.evaluate(() => window.__copied === window.__shared && window.__copied.includes('12 guests')))
  await page.pdf({ path: path.join(output, 'guest-list.pdf'), format: 'A4' })
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Mock clipboard denial') } } }); Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }) })
  await page.getByRole('button', { name: 'Share list', exact: true }).filter({ visible: true }).click()
  await page.getByText('Select and copy the list below.', { exact: true }).waitFor()
  assert.match(await page.locator('#planner-content textarea[readonly]').inputValue(), /12 guests/)
  assert.deepEqual(errors, [])
  await context.tracing.stop({ path: path.join(root, 'output/playwright/planner-inventory/design-polish-trace.zip') })
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ result: 'PASS', widths: [1440, 768, 390, 320], fontResponses, pageErrors: errors, mockAudit: JSON.parse(fs.readFileSync(path.join(evidence, 'mock-audit.json'))) }, null, 2))
  console.log('PASS: production responsive homepage/planner, local font/icons, guest export (copy, share, print, clipboard fallback), no live writes.')
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => {
  if (browser) await browser.close()
  if (server) { spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F']); fs.writeFileSync(path.join(evidence, 'production-server.log'), logs) }
})
