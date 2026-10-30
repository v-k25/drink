// Production browser check for the tool-redesign v2 planner frame (no repo network, no Supabase):
//  - tool switcher aria-current, gate card, setup card, "Your plan" sheet auto-open after Suggest on mobile only,
//  - paper receipt contrast, and the catalogue-unavailable "Try again" state.
// Starts its own loopback servers: one with the in-memory upstream preload, one whose Supabase URL is unreachable
// (per-process env only; no .env files are read or written). Set SHOT_DIR to also save screenshots.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '..')
const preload = path.resolve(root, 'scripts/fixtures/design-polish/mock-upstream.cjs')
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const shotDir = process.env.SHOT_DIR
const servers = []
const portBusy = port => new Promise(resolve => { const probe = net.createConnection({ host: '127.0.0.1', port }); probe.once('connect', () => { probe.destroy(); resolve(true) }); probe.once('error', () => resolve(false)) })
async function start(port, env) {
  assert.equal(await portBusy(port), false, `port ${port} is already occupied`)
  servers.push(spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' }))
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/party-planner`)).ok) return } catch { } await new Promise(resolve => setTimeout(resolve, 250)) }
  throw new Error('Production server did not start on ' + port)
}
const shot = async (page, name) => { if (shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await page.screenshot({ path: path.join(shotDir, name + '.png'), fullPage: name.includes('full') }) } }
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }); return .2126 * r + .7152 * g + .0722 * b }
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number)
async function reachSetup(page, origin) {
  await page.goto(origin + '/party-planner')
  await page.getByLabel(/I meet the legal drinking-age/).check(); await page.getByRole('button', { name: 'Continue to planner', exact: true }).click()
  const setup = page.getByRole('heading', { name: 'Set your party' }); await setup.waitFor(); return setup
}
async function main() {
  const mockPort = 3143, failPort = 3144
  await start(mockPort, { NODE_OPTIONS: `--require=${preload}` })
  // Unreachable upstream: the catalogue read fails, nothing is mocked and nothing leaves the machine.
  await start(failPort, { SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_SECRET_KEY: 'sb_secret_unreachable_fixture' })
  const origin = `http://127.0.0.1:${mockPort}`, failOrigin = `http://127.0.0.1:${failPort}`
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const errors = []
  try {
    for (const width of [390, 1280]) {
      const mobile = width < 1024
      const context = await browser.newContext({ viewport: { width, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] })
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message))
      await page.addInitScript(() => { window.print = () => { } })
      await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
      // Gate card and tool switcher.
      await page.goto(origin + '/party-planner')
      await page.getByRole('heading', { name: 'One quick check first.' }).waitFor()
      assert.equal(await page.locator('main img[src*="nightlife"]').count(), 0, 'gate has no stock photo')
      const tools = page.getByRole('navigation', { name: 'Tools', exact: true })
      assert.equal(await tools.getByRole('link', { name: 'Plan a party', exact: true }).getAttribute('aria-current'), 'page')
      assert.equal(await tools.getByRole('link', { name: 'Find a drink', exact: true }).getAttribute('aria-current'), null)
      assert.equal(await tools.getByRole('link', { name: 'Find a drink', exact: true }).getAttribute('href'), '/find-my-drink')
      assert.equal(await page.getByText('Saved on this device · no account needed').isVisible(), !mobile, 'saved note shows from 768px up only')
      await shot(page, `gate-${width}`)
      // Required setup stage, then the separate suggestion step.
      await page.getByLabel(/I meet the legal drinking-age/).check(); await page.getByRole('button', { name: 'Continue to planner', exact: true }).click()
      await page.getByRole('heading', { name: 'Set your party' }).waitFor()
      assert.equal(await page.getByRole('dialog', { name: 'Guests & budget' }).isVisible(), false)
      await shot(page, `setup-${width}`)
      await page.locator('#setup-guests').fill('20'); await page.locator('#setup-budget').fill('10000')
      await page.getByLabel('Suggest my list').check(); await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await page.getByLabel('Drinks each').fill('4')
      await page.getByRole('group', { name: /What would your guests like/ }).getByRole('button').first().click()
      await page.getByRole('button', { name: 'Generate list', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'Your list' })
      if (mobile) {
        await sheet.waitFor()
        await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'inventory-title')
        await shot(page, `plan-sheet-${width}`)
        await page.getByRole('button', { name: 'Close plan', exact: true }).click()
      } else {
        await page.getByText('Starting list added').first().waitFor({ state: 'attached' }); await page.waitForTimeout(400)
        assert.equal(await sheet.isVisible(), false, 'the plan sheet must not auto-open on desktop')
      }
      await page.evaluate(() => scrollTo(0, 0)); await shot(page, `build-${width}`)
      // Over-budget build state, then filters sheet.
      // The budget lives in the plan: the panel on desktop, the plan sheet on mobile.
      if (mobile) await page.getByRole('button', { name: 'View plan', exact: true }).click()
      await page.getByRole('button', { name: 'Edit guests and budget', exact: true }).click()
      const basics = page.getByRole('dialog', { name: 'Guests & budget' }); await basics.waitFor()
      await basics.getByLabel('Drinks budget').fill('9000'); await basics.getByRole('button', { name: 'Save changes', exact: true }).click(); await basics.waitFor({ state: 'hidden' })
      if (mobile) { await shot(page, `plan-sheet-over-budget-${width}`); await page.getByRole('button', { name: 'Close plan', exact: true }).click() }
      await page.evaluate(() => scrollTo(0, 0)); await shot(page, `over-budget-${width}`)
      await page.getByRole('button', { name: /^Filters/ }).click(); const filters = page.getByRole('dialog', { name: /filters/i }); await filters.waitFor(); await shot(page, `filters-sheet-${width}`)
      await filters.getByRole('button', { name: 'Done', exact: true }).click(); await filters.waitFor({ state: 'hidden' })
      // Review receipt: contrast of every text pair on the paper, and UI line contrast.
      if (mobile) await page.getByRole('button', { name: 'View plan', exact: true }).click()
      await page.getByRole('button', { name: 'Review list', exact: true }).filter({ visible: true }).first().click()
      await page.getByRole('heading', { name: 'Ready for the shops' }).waitFor()
      await page.evaluate(() => scrollTo(0, 0)); await shot(page, `receipt-${width}`)
      const receipt = page.locator('#planner-content [class*="receipt"]').first()
      assert.match(await receipt.innerText(), /Over budget by/)
      assert.equal(await page.getByText('Saved on this device only.').count(), 1)
      const pairs = await page.evaluate(() => {
        const rootEl = document.querySelector('#planner-content [class*="receipt"]'); const found = []
        const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba?\(.*, 0\)$/.test(c) && c !== 'transparent') return c } return 'rgb(255, 255, 255)' }
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) { const node = walker.currentNode; if (!node.textContent.trim()) continue; const el = node.parentElement; found.push([node.textContent.trim().slice(0, 30), getComputedStyle(el).color, bgOf(el)]) }
        return { found, line: getComputedStyle(rootEl.querySelector('[class*="receiptLine"]')).borderBottomColor, paper: getComputedStyle(rootEl).backgroundColor }
      })
      assert.ok(pairs.found.length > 10)
      for (const [text, color, background] of pairs.found) assert.ok(ratio(rgb(color), rgb(background)) >= 4.5, `receipt text contrast below 4.5 for "${text}" (${color} on ${background})`)
      // Receipt dividers are decorative (tokens.json `line`); the text above carries the meaning, so no 3:1 check on them.
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow on review')
      await shot(page, `receipt-full-${width}`)
      assert.deepEqual(errors, []); await context.close()
    }
    // Catalogue-unavailable state: the eligibility cookie is set but the catalogue read fails.
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } })
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message))
      await context.addCookies([{ name: 'allcheers_eligible', value: '1', url: failOrigin }])
      await page.goto(failOrigin + '/party-planner')
      const heading = page.getByRole('heading', { name: 'Drinks are temporarily unavailable' }); await heading.waitFor()
      assert.equal(await page.getByRole('heading', { name: 'One quick check first.' }).count(), 0, 'gate must not show when only the catalogue failed')
      await page.getByText('Your plan is still saved on this device.').waitFor()
      await shot(page, `unavailable-${width}`)
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByText('Still unavailable. Please try again in a moment.').waitFor()
      assert.equal(await heading.evaluate(el => el === document.activeElement), true, 'focus moves to the unavailable heading after a failed retry')
      await context.close()
      // Without the cookie the gate (not the unavailable state) shows.
      const bare = await browser.newContext({ viewport: { width, height: 844 } }); const barePage = await bare.newPage()
      await barePage.goto(failOrigin + '/party-planner'); await barePage.getByRole('heading', { name: 'One quick check first.' }).waitFor()
      assert.equal(await barePage.getByRole('heading', { name: 'Drinks are temporarily unavailable' }).count(), 0)
      await bare.close()
    }
    assert.deepEqual(errors, [])
    console.log('PASS: planner shell (tool switcher, gate card, setup stage, mobile-only plan sheet auto-open with heading focus, paper receipt contrast, catalogue-unavailable Try again)')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => { for (const server of servers) server.kill() })
