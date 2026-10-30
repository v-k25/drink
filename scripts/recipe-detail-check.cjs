const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE)

async function main() {
  const row = JSON.parse(fs.readFileSync('output/recipe-curation/remote-before.jsonl', 'utf8').split('\n')[0])
  const draft = JSON.parse(fs.readFileSync('output/recipe-curation/reviewed-drafts.jsonl', 'utf8').split('\n')[0])
  Object.assign(row, draft, { status: 'published', editorial_ready: true, recipe_quality_issues: [] })
  const upstream = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const rows = (url.searchParams.get('id') || '').startsWith('neq.') ? [] : [row]
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': rows.length ? '0-0/1' : '*/0' })
    res.end(JSON.stringify(rows))
  })
  await new Promise(resolve => upstream.listen(3138, '127.0.0.1', resolve))
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3139'], { env: { ...process.env, SUPABASE_URL: 'http://127.0.0.1:3138', SUPABASE_ANON_KEY: 'test-only' }, stdio: 'ignore' })
  let browser
  try {
    for (let n = 0; n < 60; n++) {
      try { await fetch('http://127.0.0.1:3139'); break } catch { await new Promise(r => setTimeout(r, 250)) }
    }
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true })
    const context = await browser.newContext()
    await context.addCookies([{ name: 'allcheers_eligible', value: '1', url: 'http://127.0.0.1:3139' }])
    await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:3139') ? route.continue() : route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    fs.mkdirSync('output/playwright/recipe-detail', { recursive: true })
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      const response = await page.goto('http://127.0.0.1:3139/find-my-drink/dn-cape-codder')
      assert.equal(response.status(), 200)
      await page.getByRole('button', { name: 'Start making', exact: true }).waitFor()
      const body = await page.locator('body').innerText()
      // Metric-first checklist: converted lines lead with the metric quantity
      // and do not repeat the source-unit amount; the wedge stays verbatim; the
      // note labels the approximations; old note wordings are gone.
      for (const text of ['Cape Codder', 'Yield: 1 cocktail', 'Glass: Highball glass', 'Allergens: not specified', 'Caffeine: not specified', '~44 mL Vodka', '~89 mL Cranberry Juice', '1 wedge Lime', 'Approximate metric conversions; source quantities retained internally. Where conversion is unclear, original unit shown.']) assert.ok(body.includes(text), text)
      assert.ok(!body.includes('1.5 oz. Vodka'), 'converted lines must not repeat the source-unit amount')
      assert.ok(!body.includes('3 oz. Cranberry Juice'), 'converted lines must not repeat the source-unit amount')
      assert.ok(!body.includes('Quantities are shown in the units the recipe was imported with'), 'the old imported-units note must be replaced')
      assert.ok(!body.includes('Metric amounts are approximate conversions from the source; no serving scaling.'), 'the prior note wording must be replaced')
      assert.ok(!body.includes('Original quantities are kept for every ingredient'), 'the prior below-section note wording must be replaced')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`)
      await page.getByRole('checkbox').first().check()
      await page.getByRole('status').filter({ hasText: '1 of 3 ingredients gathered' }).waitFor()
      await page.getByRole('button', { name: 'Start making', exact: true }).click()
      await page.getByText('Step 1 of 3', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Next', exact: true }).click()
      await page.getByText('Step 2 of 3', { exact: true }).waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'start-making', 'Escape must return focus to Start making')
      await page.getByRole('button', { name: 'Start making', exact: true }).click()
      await page.getByText('Step 1 of 3', { exact: true }).waitFor()
      await page.keyboard.press('ArrowRight')
      await page.getByText('Step 2 of 3', { exact: true }).waitFor()
      await page.screenshot({ path: `output/playwright/recipe-detail/detail-${width}.png`, fullPage: true, animations: 'disabled' })
    }
    assert.deepEqual(errors, [])
    console.log('PASS: production detail metadata, unknowns, checklist, step mode, 1440/768/390/320px, no page errors')
  } finally {
    if (browser) await browser.close()
    server.kill()
    server.unref()
    upstream.closeAllConnections()
    upstream.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
