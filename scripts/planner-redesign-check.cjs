const assert = require('node:assert/strict')
const net = require('node:net')
const { spawn } = require('node:child_process')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '..')
const port = 3138
const origin = `http://127.0.0.1:${port}`
const preload = path.resolve(root, 'scripts/fixtures/design-polish/mock-upstream.cjs')
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
let server
function portBusy() { return new Promise(resolve => { const probe = net.createConnection({ host: '127.0.0.1', port }); probe.once('connect', () => { probe.destroy(); resolve(true) }); probe.once('error', () => resolve(false)) }) }
async function waitForServer() { for (let i = 0; i < 100; i++) { try { if ((await fetch(origin + '/party-planner')).ok) return } catch {} await new Promise(resolve => setTimeout(resolve, 250)) } throw new Error('Production server did not start') }
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `horizontal overflow at ${await page.evaluate(() => innerWidth)}px`) }
async function touchTargets(page) { assert.equal(await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => !button.classList.contains('close')).every(button => { const rect = button.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44 })), true, 'visible button touch target below 44px') }
async function main() {
  assert.equal(await portBusy(), false, `port ${port} is already occupied`)
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...process.env, NODE_OPTIONS: `--require=${preload}` }, stdio: 'ignore' })
  await waitForServer()
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const pageErrors = []
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    page.on('pageerror', error => pageErrors.push(error.message))
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    await page.goto(origin + '/party-planner', { waitUntil: 'networkidle' })
    await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/gate.png'), fullPage: true })
    await noOverflow(page); await touchTargets(page)
    await page.getByLabel(/I meet the legal drinking-age/).check()
    await page.getByRole('button', { name: 'Continue to planner', exact: true }).click()
    await page.getByRole('heading', { name: 'Set your party' }).waitFor(); assert.equal(await page.getByRole('dialog', { name: 'Guests & budget' }).isVisible(), false, 'no auto-opened dialog')
    await page.locator('#setup-guests').fill('20'); await page.locator('#setup-budget').fill('5000'); await page.getByRole('button', { name: 'Choose drinks myself', exact: true }).click()
    // The dialog path stays covered: Edit guests and budget opens the same fields.
    await page.getByRole('button', { name: 'Edit guests and budget', exact: true }).click(); const basics = page.getByRole('dialog', { name: 'Guests & budget' }); await basics.waitFor(); assert.equal(await basics.getByLabel('Guests', { exact: true }).inputValue(), '20'); await basics.getByRole('button', { name: 'Cancel', exact: true }).click()
    const beer = page.getByRole('button', { name: /^Beer\s/ }).first(); await beer.click()
    const add = page.locator('[aria-label^="Add "][aria-label$="to inventory"]').first(); const productName = await add.getAttribute('aria-label'); await add.click()
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/populated.png'), fullPage: true })
    assert.equal(await page.locator('li[data-product-id]').first().evaluate(element => getComputedStyle(element).transitionDuration), '0s')
    assert.equal(await page.getByRole('button', { name: /^Beer\s/ }).first().getAttribute('aria-current'), 'true')
    const shelfRegion = page.getByRole('region', { name: 'Beer selection', exact: true }); await shelfRegion.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/categories.png'), fullPage: false })
    assert.equal(await page.getByRole('button', { name: /^Beer\s/ }).first().getAttribute('aria-current'), 'true'); assert.equal(await page.locator('input[id^="card-quantity-"]').count(), 1); assert.equal(await page.locator('input[id^="card-quantity-"]').inputValue(), '1')
    const name = productName.replace(/^Add | to inventory$/g, ''); await page.locator('li[data-product-id]').getByRole('button', { name: `Increase ${name} packs`, exact: true }).click(); assert.equal(await page.locator('input[id^="card-quantity-"]').inputValue(), '2')
    await page.getByLabel('Search all drinks').fill('zzzz-no-match')
    const activeBar = page.locator('div[class*="activeFilters"]')
    await activeBar.waitFor({ state: 'visible' }); assert.ok(await page.getByRole('button', { name: 'Remove search filter', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Reset filters', exact: true }).click(); await activeBar.waitFor({ state: 'hidden' })
    assert.ok(await page.locator('[aria-label^="Add "][aria-label$="to inventory"]').count())
    await page.getByRole('button', { name: /^Filters/ }).click(); const filters = page.getByRole('dialog', { name: /filters/i }); assert.equal(await filters.isVisible(), true); await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/filter.png'), fullPage: false }); await filters.getByRole('button', { name: /close/i }).click()
    await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/drawer.png'), fullPage: false }); await page.getByRole('button', { name: 'Review list', exact: true }).click() // desktop shows the plan in the aside; no drawer; await page.waitForSelector('text=Ready for the shops.'); await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/receipt.png'), fullPage: true })
    await page.getByRole('button', { name: 'Edit list', exact: true }).click(); assert.equal(await page.getByRole('heading', { name: 'Build your list.' }).count(), 1); await page.reload({ waitUntil: 'networkidle' }); /* eligibility cookie is set: the gate is skipped and the draft restored */ await page.getByRole('heading', { name: 'Build your list.' }).waitFor(); assert.equal(await page.getByLabel(/I meet the legal drinking-age/).count(), 0); assert.equal(await page.locator('input[id^="card-quantity-"]').count(), 1); assert.equal(await page.locator('input[id^="card-quantity-"]').inputValue(), '2')
    // Categories are browse-only now: removal is per item, with Undo (no "Remove <category> category" step).
    await page.getByRole('button', { name: `Remove ${name}`, exact: true }).click(); await page.getByRole('button', { name: 'Undo', exact: true }).click(); assert.equal(await page.locator('input[id^="card-quantity-"]').inputValue(), '2'); await page.getByRole('button', { name: `Remove ${name}`, exact: true }).click(); await page.getByRole('button', { name: 'Add at least one drink', exact: true }).click(); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Beer selection')
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    for (const viewport of [{ width: 1024, height: 768 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) { await page.setViewportSize(viewport); await page.waitForTimeout(50); await noOverflow(page); await touchTargets(page) }
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(50)
    const mobileShelf = page.getByRole('region', { name: 'Beer selection', exact: true }); await mobileShelf.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/mobile-shelf.png'), fullPage: false })
    await page.getByRole('button', { name: 'View plan', exact: true }).click(); await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/mobile-drawer.png'), fullPage: false }); await page.getByRole('button', { name: 'Close plan', exact: true }).click()
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(root, 'output/playwright/planner-redesign/mobile.png'), fullPage: false })
    assert.deepEqual(pageErrors, []); await context.close(); console.log('PASS: planner redesign gate, vertical index, menu shelf, active filters, interactions, receipt, reload, responsive overflow, touch targets, reduced motion, screenshots')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => { if (server) server.kill() })
