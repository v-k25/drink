const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const origin = 'http://127.0.0.1:3156'
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3156'], { env: { ...process.env, SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_SECRET_KEY: 'sb_secret_unreachable_fixture' }, stdio: 'ignore' })
async function ready() { for (let i = 0; i < 100; i++) { try { if ((await fetch(origin + '/party-planner')).ok) return } catch {} await new Promise(r => setTimeout(r, 200)) } throw Error('server did not start') }
async function run() {
  await ready()
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } })
      await context.addCookies([{ name: 'allcheers_eligible', value: '1', url: origin }])
      const page = await context.newPage()
      await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
      await page.goto(origin + '/party-planner')
      const heading = page.getByRole('heading', { name: "We couldn't load the drinks catalogue." })
      await heading.waitFor()
      await page.getByRole('button', { name: 'Try again' }).click()
      await page.getByText('Still unavailable. Please try again in a moment.').waitFor()
      assert.equal(await heading.evaluate(el => document.activeElement === el), true)
      await context.close()
    }
    console.log('PASS: fixture production browser catalogue failure, Retry and focus at 390/1280')
  } finally { await browser.close() }
}
run().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => server.kill())
