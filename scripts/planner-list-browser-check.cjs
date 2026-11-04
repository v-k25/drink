// Party Planner (tools redesign, TR5) production browser check: the one-page list, device draft and exports.
// Starts its own loopback server with the deny-by-default in-memory upstream, which serves planner_products from
// app/party-planner/catalogue.json; it never contacts Supabase. Run after pnpm build, with PLAYWRIGHT_MODULE and
// PLAYWRIGHT_CHROMIUM_EXECUTABLE set. Screenshots: output/playwright/planner-list/.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '..')
const preload = path.resolve(root, 'scripts/fixtures/design-polish/mock-upstream.cjs')
const output = path.join(root, 'output/playwright/planner-list')
const port = 3157, origin = 'http://127.0.0.1:' + port
const rupees = text => Number(text.replace(/[^\d]/g, ''))
const portBusy = () => new Promise(resolve => { const probe = net.createConnection({ host: '127.0.0.1', port }); probe.once('connect', () => { probe.destroy(); resolve(true) }); probe.once('error', () => resolve(false)) })

async function main() {
  assert.equal(await portBusy(), false, 'port ' + port + ' is free')
  fs.mkdirSync(output, { recursive: true })
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...process.env, NODE_OPTIONS: '--require=' + preload }, stdio: 'ignore' })
  let browser
  try {
    let ready = false
    for (let i = 0; i < 120; i++) { try { if ((await fetch(origin + '/party-planner')).ok) { ready = true; break } } catch { } await new Promise(r => setTimeout(r, 250)) }
    assert.ok(ready, 'production server ready')
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    await context.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed++ }; delete Navigator.prototype.share })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })

    // Age check first, then the list straight away with the usual mix.
    await page.goto(origin + '/party-planner')
    await page.getByLabel(/I meet the legal drinking-age/).check()
    await page.getByRole('button', { name: 'Continue to planner', exact: true }).click()
    await page.getByRole('heading', { name: 'Party Planner', level: 1 }).waitFor()
    const chip = name => page.getByRole('group', { name: 'What to buy' }).getByRole('button', { name, exact: true })
    const pressed = async locator => (await locator.getAttribute('aria-pressed')) === 'true'
    assert.equal(await page.getByRole('textbox', { name: 'Guests' }).inputValue(), '20')
    assert.equal(await page.getByRole('textbox', { name: 'Drinks budget' }).inputValue(), '10000')
    for (const name of ['Beer', 'Wine', 'Rum', 'Vodka', 'Whisky', 'Gin', 'Tequila', 'Ready to drink']) assert.equal(await chip(name).count(), 1, name + ' chip')
    const on = async () => { const names = []; for (const name of ['Beer', 'Wine', 'Rum', 'Vodka', 'Whisky', 'Gin', 'Tequila', 'Ready to drink']) if (await pressed(chip(name))) names.push(name); return names }
    assert.deepEqual(await on(), ['Beer', 'Rum', 'Vodka'], 'usual mix')
    await page.getByText('Our usual mix. Change any.', { exact: true }).waitFor()

    // The sums: line total = bottles × the chosen bottle's price; the total adds up; left = budget - total.
    const rows = page.locator('table tbody tr')
    async function checkSums(budget) {
      const lines = []
      for (let i = 0; i < await rows.count(); i++) {
        const row = rows.nth(i)
        const label = (await row.locator('th b').textContent()).trim()
        const quantity = Number(await row.locator('td').first().textContent())
        const subtotal = rupees((await row.locator('td').last().textContent()).split('=').pop())
        const option = page.getByRole('group', { name: 'Choose a ' + label + ' bottle' }).locator('button[aria-pressed="true"]')
        const price = rupees(await option.locator('b').textContent())
        assert.equal(subtotal, quantity * price, label + ' line total')
        assert.equal(await row.locator('th span').textContent(), await option.locator('span span').first().textContent(), label + ' shows the chosen bottle')
        lines.push(subtotal)
      }
      const total = rupees(await page.locator('main').getByText('Estimated total', { exact: true }).locator('xpath=..').locator('b').textContent())
      assert.equal(total, lines.reduce((a, b) => a + b, 0), 'total is the sum of the lines')
      const status = await page.locator('[class*="statusLine"] span').first().textContent()
      if (total <= budget) assert.equal(status, '₹' + (budget - total).toLocaleString('en-IN') + ' left')
      else assert.equal(status, '₹' + (total - budget).toLocaleString('en-IN') + ' over budget')
      return { total, lines }
    }
    const first = await checkSums(10000)
    assert.equal(first.lines.length, 3)
    await page.getByText(/^₹[\d,]+ per guest · budget ₹10,000$/).waitFor()

    // Taste answers pre-pick the chips; changing a chip makes them the host's picks.
    await page.getByRole('button', { name: 'Herbal', exact: true }).click()
    await page.getByRole('button', { name: 'Citrusy', exact: true }).click()
    await page.getByRole('button', { name: 'With a mixer', exact: true }).click()
    assert.deepEqual(await on(), ['Gin', 'Tequila'], 'herbal and citrusy with a mixer')
    await page.getByText('Picked from your answers. Change any.', { exact: true }).waitFor()
    await chip('Beer').click()
    await page.getByText('Your picks.', { exact: true }).waitFor()
    assert.deepEqual(await on(), ['Beer', 'Gin', 'Tequila'])
    await checkSums(10000)

    // Quantities and bottle choices.
    const qty = label => page.locator('[class*="qty"]', { has: page.getByRole('button', { name: 'One more ' + label + ' bottle' }) }).locator('> span')
    const beerBefore = Number((await qty('Beer').textContent()).replace(/\D/g, ''))
    await page.getByRole('button', { name: 'One more Beer bottle', exact: true }).click()
    assert.equal(Number((await qty('Beer').textContent()).replace(/\D/g, '')), beerBefore + 1)
    await checkSums(10000)
    const gin = page.getByRole('group', { name: 'Choose a Gin bottle' }).getByRole('button')
    await gin.nth(2).click()
    assert.ok(await pressed(gin.nth(2)))
    await page.getByRole('textbox', { name: 'Drinks budget' }).fill('50000')
    await checkSums(50000)
    // New guests reset the counts to the suggestion.
    await page.getByRole('button', { name: 'More guests', exact: true }).click()
    assert.equal(await page.getByRole('textbox', { name: 'Guests' }).inputValue(), '21')
    assert.match(await page.locator('[class*="categoryHead"]').first().textContent(), new RegExp('Suggested ' + (await qty('Beer').textContent()).replace(/\D/g, '') + ' bottles'))

    // Over budget: cheaper bottles first, then honest about being over.
    await page.getByRole('textbox', { name: 'Drinks budget' }).fill('1000')
    await page.getByText(/^(Switched to cheaper bottles to fit your budget\.|Even the cheaper bottles are over your budget\. Try fewer categories or a bigger budget\.)$/).waitFor()
    assert.ok(await pressed(gin.nth(2)), 'a bottle the host picked is never switched')
    const over = await checkSums(1000)
    assert.ok(over.total > 1000)
    assert.equal(await page.locator('[class*="meterOver"]').count(), 1)

    // Draft: survives a reload on this device.
    await page.getByRole('textbox', { name: 'Drinks budget' }).fill('25000')
    await page.reload()
    await page.getByRole('heading', { name: 'Party Planner', level: 1 }).waitFor()
    assert.equal(await page.getByRole('textbox', { name: 'Guests' }).inputValue(), '21')
    assert.equal(await page.getByRole('textbox', { name: 'Drinks budget' }).inputValue(), '25000')
    assert.deepEqual(await on(), ['Beer', 'Gin', 'Tequila'])
    assert.ok(await pressed(page.getByRole('button', { name: 'Herbal', exact: true })))
    assert.ok(await pressed(page.getByRole('group', { name: 'Choose a Gin bottle' }).getByRole('button').nth(2)), 'bottle pick restored')
    await checkSums(25000)

    // Exports go through the server check: Copy, Share (falls back to copy without the share sheet) and Print.
    await page.getByRole('button', { name: 'Copy', exact: true }).click()
    await page.getByText('List copied. Paste it into WhatsApp or notes.', { exact: true }).waitFor()
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')
    assert.ok(!/\(quarts\)|ML\)|[A-Z]{6,} [A-Z]{6,}/.test(copied), 'clean bottle names in the copied list')
    assert.match(copied, /^Jaipur party plan for 21 guests\nBudget: ₹25,000\.00\n/)
    assert.equal(copied.split('\n').filter(line => / × ₹/.test(line)).length, 3)
    const bar = page.getByRole('region', { name: 'List total' })
    assert.ok(await bar.isVisible(), 'sticky bar on phones')
    await bar.getByRole('button', { name: 'Share list', exact: true }).click()
    await page.getByText('List copied. Paste it into WhatsApp or notes.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Print', exact: true }).click()
    await page.waitForFunction(() => window.__printed === 1)
    assert.equal(await page.locator('[class*="printOnly"] h3').textContent(), 'Socifer party list')
    await page.emulateMedia({ media: 'print' })
    await page.screenshot({ path: path.join(output, 'print-390.png'), fullPage: true })
    await page.emulateMedia({ media: 'screen' })

    // Empty and invalid states.
    for (const name of ['Beer', 'Gin', 'Tequila']) await chip(name).click()
    await page.getByText('Pick at least one thing to buy.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('region', { name: 'List total' }).count(), 0, 'no bar without a list')
    await chip('Rum').click()
    await page.getByRole('textbox', { name: 'Guests' }).fill('')
    await page.getByText('Enter 1 to 1,000 guests.', { exact: true }).waitFor()
    await page.getByText('Enter your guests and budget to see the list.', { exact: true }).waitFor()
    await page.getByRole('textbox', { name: 'Guests' }).fill('20')

    // Layout: one pink action, no sideways scroll, 44px targets, the bar only on phones; 200% text.
    await page.evaluate(() => localStorage.removeItem('socifer_planner_draft_v2'))
    for (const width of [320, 390, 768, 834, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(origin + '/party-planner')
      await page.getByRole('heading', { name: 'Party Planner', level: 1 }).waitFor()
      const fruity = page.getByRole('button', { name: 'Fruity', exact: true })
      if (!(await pressed(fruity))) await fruity.click() // the draft keeps it from the previous width
      await page.getByText('Picked from your answers. Change any.', { exact: true }).waitFor()
      await page.mouse.move(0, 0)
      await page.locator('table').waitFor()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ' overflow')
      const small = await page.locator('main button, main input, main a').evaluateAll(nodes => nodes.filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5 }).map(n => n.textContent.trim() || n.getAttribute('aria-label') || n.id))
      assert.deepEqual(small, [], width + ' targets')
      const pinks = await page.locator('button').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length && getComputedStyle(n).backgroundColor === 'rgb(255, 45, 135)').length)
      assert.equal(pinks, 1, width + ' one pink action')
      assert.equal(await page.getByRole('region', { name: 'List total' }).isVisible(), width < 768, width + ' sticky bar')
      if (width >= 1024) { // Your party stays in view while the list scrolls
        // Scroll within the two-column area (past its end the panel leaves with it, as sticky should).
        const scroll = await page.evaluate(() => { const layout = document.querySelector('#party-title').closest('section').parentElement; const party = document.querySelector('#party-title').closest('section'); return Math.min(900, layout.getBoundingClientRect().bottom + scrollY - party.offsetHeight - 140) })
        await page.evaluate(y => scrollTo(0, y), scroll)
        const top = await page.getByRole('region', { name: 'Your party' }).evaluate(n => n.getBoundingClientRect().top)
        assert.ok(scroll > 200 && top >= 76 && top <= 110, width + ' sticky panel at ' + top + ' after ' + scroll)
        await page.evaluate(() => scrollTo(0, 0))
      }
      await page.screenshot({ path: path.join(output, 'planner-' + width + '.png'), fullPage: true })
    }
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 700 })
      await page.goto(origin + '/party-planner')
      await page.locator('table').waitFor()
      await page.evaluate(() => document.documentElement.style.fontSize = '200%')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% text ' + width)
      await page.screenshot({ path: path.join(output, 'text-200-' + width + '.png'), fullPage: true })
    }
    assert.deepEqual(errors, [], 'no page errors')
    console.log('PASS: Party Planner one page (age check, usual mix, taste pre-picks, chips, line and total sums, left/over, per guest, quantities, bottle choice, guest reset, cheaper fit, over budget, draft reload, copy, share fallback, print, empty and invalid states) at 320/390/768/834/1024/1440 and 200% text. Screenshots: ' + output)
  } finally {
    await browser?.close()
    server.kill()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
