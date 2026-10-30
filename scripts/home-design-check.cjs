// Production UI check. Uses the existing Playwright installation; no live form submissions.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.HOME_CHECK_ORIGIN || 'http://127.0.0.1:3125'
const output = path.resolve('output/playwright/home-redesign')

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    await context.route('**/*', route => new URL(route.request().url()).origin === origin && route.request().method() === 'GET' ? route.continue() : route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal((await page.goto(origin)).status(), 200)
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('h1').count(), 1)
      const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })))
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}: ${JSON.stringify(overflow)}`)
      for (const href of await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href')))) {
        assert.ok(await page.locator(href).count(), `missing target ${href}`)
      }
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded()
        await img.evaluate(el => el.complete && el.naturalWidth ? undefined : new Promise(resolve => el.addEventListener('load', resolve, { once: true })))
        await img.evaluate(el => el.decode())
        assert.ok(await img.evaluate(el => el.naturalWidth > 0))
      }
      assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0, 'reduced motion must be static')
      await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true })
      await page.evaluate(() => window.scrollTo(0, 0))
      if (width <= 390) {
        const menu = page.locator('header details')
        await menu.locator('summary').click()
        assert.ok(await menu.locator('a[href="/find-my-drink"]').isVisible())
        await menu.locator('summary').click()
      }
      const question = page.locator('main details summary').first()
      await question.click()
      assert.ok(await question.evaluate(el => el.parentElement.open))
      await question.click()
      const email = page.getByLabel('Email address', { exact: true })
      await email.fill('not-an-email')
      assert.equal(await email.evaluate(el => el.checkValidity()), false)
      assert.equal(await page.locator('input[name="consent"]').isChecked(), false)
      assert.equal(await page.locator('input[value="jaipur"]').isChecked(), false)
      console.log(`PASS: ${width}px layout, images, anchors, FAQ, signup validation${width <= 390 ? ', mobile menu' : ''}`)
    }
    await page.goto(origin)
    await page.keyboard.press('Tab')
    assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true)
    for (const route of ['/find-my-drink', '/party-planner']) assert.equal((await page.goto(origin + route)).status(), 200)
    assert.deepEqual(errors, [])
    console.log('PASS: keyboard skip link, product routes, zero page errors; no external requests or form writes')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
