// B3 "Jaipur After Dark" landing: hero containment (incl. 200% text), 44px targets, local imagery,
// keyboard menu/FAQ, skip link and routes. Complements home-design-check.cjs, which covers layout,
// anchors, reduced motion and signup validation. Starts its own production server unless
// BREWLIST_HOME_ORIGIN points at one already running; requires a completed `pnpm build`.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const port = 3192
const externalOrigin = process.env.BREWLIST_HOME_ORIGIN
const origin = externalOrigin || `http://127.0.0.1:${port}`
const screenshotDir = process.env.BREWLIST_SCREENSHOT_DIR || path.resolve(__dirname, '..', 'output/playwright/brewlist-home')

async function assertHeroContentFits(page, label) {
  const overflow = await page.locator('h1').locator('..').evaluate(container => {
    const hero = container.closest('section')
    const heroBounds = hero.getBoundingClientRect()
    const inBounds = rect => rect.left >= 0 && rect.right <= innerWidth && rect.top >= heroBounds.top && rect.bottom <= heroBounds.bottom
    const failures = []

    for (const element of container.querySelectorAll('h1, p, a')) {
      const rect = element.getBoundingClientRect()
      if (!inBounds(rect)) failures.push(`${element.tagName.toLowerCase()}: ${Math.round(rect.left)},${Math.round(rect.right)},${Math.round(rect.top)},${Math.round(rect.bottom)}`)
    }

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(walker.currentNode)
      for (const rect of range.getClientRects()) {
        if (rect.width && rect.height && !inBounds(rect)) failures.push(`text "${walker.currentNode.textContent.trim()}" at ${Math.round(rect.left)},${Math.round(rect.right)},${Math.round(rect.top)},${Math.round(rect.bottom)}`)
      }
    }
    return failures
  })
  assert.deepEqual(overflow, [], `hero content escapes bounds at ${label}: ${overflow.join('; ')}`)
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true })
  let server
  if (!externalOrigin) {
    try { await fetch(origin); throw new Error(`Port ${port} already in use; refusing to reuse it`) } catch (error) { if (!error.cause) throw error }
    assert.ok(fs.existsSync(path.resolve(__dirname, '..', '.next', 'BUILD_ID')), 'a completed production build (.next) is required; run pnpm build first')
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' })
    let ready = false
    for (let i = 0; i < 80 && !ready; i++) { try { ready = (await fetch(origin)).ok } catch {} if (!ready) await new Promise(r => setTimeout(r, 250)) }
    assert.ok(ready, 'production server did not become ready')
  }
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    page.setDefaultTimeout(10_000)
    page.setDefaultNavigationTimeout(30_000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal((await page.goto(origin)).status(), 200)
      assert.equal(await page.locator('h1').count(), 1)
      assert.ok(await page.getByRole('heading', { name: 'Book the night.', level: 1 }).isVisible())
      assert.equal(await page.getByRole('link', { name: 'Get launch updates', exact: true }).first().getAttribute('href'), '#early-access', 'waitlist-only CTA')
      const localImages = page.locator('main img')
      assert.equal(await localImages.count(), 3, 'expected local hero and tool images')
      // Tool images are lazy-loaded: scroll each into view before expecting it to have loaded.
      for (const image of await localImages.all()) {
        await image.scrollIntoViewIfNeeded()
        await image.evaluate(element => element.complete && element.naturalWidth ? undefined : new Promise((resolve, reject) => { element.addEventListener('load', resolve, { once: true }); element.addEventListener('error', () => reject(new Error('image failed to load')), { once: true }) }))
      }
      await page.evaluate(() => scrollTo(0, 0))
      for (const image of await localImages.all()) {
        assert.match(await image.getAttribute('src'), /(?:%2F|\/)images(?:%2F|\/)nightlife(?:%2F|\/)/, 'image is not served from a local nightlife asset')
        assert.ok(await image.evaluate(element => element.naturalWidth > 0), 'local image has no natural width')
      }
      assert.equal(await page.locator('img[src^="http"]').count(), 0, 'external runtime image found')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`)
      await assertHeroContentFits(page, `${width}px`)
      const faq = page.locator('#faq summary').first()
      await faq.focus(); await page.keyboard.press('Enter'); assert.equal(await faq.evaluate(el => el.parentElement.open), true)
      for (const target of await page.locator('header a, header summary, footer nav a, #faq summary, .access-form .button, .check-label').all()) {
        if (await target.isVisible()) {
          const box = await target.boundingBox()
          const tag = await target.evaluate(element => element.tagName.toLowerCase())
          const text = (await target.innerText()).replace(/\s+/g, ' ').trim()
          assert.ok(box && box.height >= 44, `target below 44px: <${tag}> "${text}" ${box?.width ?? 0}×${box?.height ?? 0}`)
        }
      }
      if (width < 1024) {
        const menu = page.locator('header details')
        await menu.locator('summary').focus()
        await page.keyboard.press('Enter')
        const links = menu.locator('nav a')
        assert.equal(await links.count(), 5, 'four destinations plus the launch-updates CTA')
        for (const link of await links.all()) {
          assert.ok(await link.isVisible())
          const box = await link.boundingBox()
          assert.ok(box.width >= 44 && box.height >= 44, `mobile menu target below 44px at ${width}`)
        }
        await links.first().focus()
        assert.equal(await links.first().evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Tab')
        assert.equal(await links.nth(1).evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Escape')
        assert.equal(await menu.evaluate(el => el.open), false, 'Escape closes the menu')
        assert.equal(await menu.locator('summary').evaluate(el => el === document.activeElement), true, 'Escape returns focus to the menu button')
      }
      if (width === 1440 || width === 390) await page.screenshot({ path: `${screenshotDir}/brewlist-nightlife-${width}-full.png`, fullPage: true })
      if (width === 1440 || width === 390) await page.locator('main').locator('section').first().screenshot({ path: `${screenshotDir}/brewlist-nightlife-${width}-hero.png` })
    }
    await page.setViewportSize({ width: 390, height: 900 })
    assert.equal((await page.goto(origin)).status(), 200)
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await assertHeroContentFits(page, '390px at 200% root text size')
    await page.goto(origin); await page.keyboard.press('Tab'); assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true)
    for (const route of ['/', '/party-planner', '/find-my-drink']) assert.equal((await page.goto(origin + route)).status(), 200)
    assert.deepEqual(errors, [])
    console.log('PASS: local hero image, no external runtime images, targets, responsive layout, keyboard FAQ/menu, skip link, routes, and zero page errors')
  } finally {
    await browser.close()
    if (server) { server.kill(); server.unref() }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
