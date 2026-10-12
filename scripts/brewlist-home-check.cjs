const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.BREWLIST_HOME_ORIGIN || 'http://127.0.0.1:3192'
const screenshotDir = process.env.BREWLIST_SCREENSHOT_DIR || 'C:/Users/vritr/AppData/Local/Temp/opencode'

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
      assert.ok(await page.getByRole('heading', { name: /Club bookings\s+in Jaipur/ }).isVisible())
      const localImages = page.locator('main img')
      assert.equal(await localImages.count(), 3, 'expected local hero and tool images')
      await page.waitForFunction(() => Array.from(document.querySelectorAll('main img')).every(image => image.complete && image.naturalWidth > 0), null, { timeout: 10_000 })
      for (const image of await localImages.all()) {
        assert.match(await image.getAttribute('src'), /%2Fimages%2Fnightlife%2F/, 'image is not served from a local nightlife asset')
        assert.ok(await image.evaluate(element => element.naturalWidth > 0), 'local image has no natural width')
      }
      assert.equal(await page.locator('img[src^="http"]').count(), 0, 'external runtime image found')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`)
      await assertHeroContentFits(page, `${width}px`)
      const faq = page.locator('#faq summary').first()
      await faq.focus(); await page.keyboard.press('Enter'); assert.equal(await faq.evaluate(el => el.parentElement.open), true)
      for (const target of await page.locator('header a, footer a, #faq summary, .access-form .button, .check-label').all()) {
        if (await target.isVisible()) {
          const box = await target.boundingBox()
          const tag = await target.evaluate(element => element.tagName.toLowerCase())
          const text = (await target.innerText()).replace(/\s+/g, ' ').trim()
          assert.ok(box && box.height >= 44, `target below 44px: <${tag}> "${text}" ${box?.width ?? 0}×${box?.height ?? 0}`)
        }
      }
      if (width <= 768) {
        const menu = page.locator('header details')
        await menu.locator('summary').focus()
        await page.keyboard.press('Enter')
        const links = menu.locator('nav a')
        assert.equal(await links.count(), 4)
        for (const link of await links.all()) {
          assert.ok(await link.isVisible())
          const box = await link.boundingBox()
          assert.ok(box.width >= 44 && box.height >= 44, `mobile menu target below 44px at ${width}`)
        }
        await links.first().focus()
        assert.equal(await links.first().evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Tab')
        assert.equal(await links.nth(1).evaluate(el => el === document.activeElement), true)
        await menu.locator('summary').focus()
        await page.keyboard.press('Enter')
      }
      if (width === 1440 || width === 390) await page.screenshot({ path: `${screenshotDir}/brewlist-nightlife-${width}-full.png`, fullPage: true })
      if (width === 1440 || width === 390) await page.locator('main').locator('section').first().screenshot({ path: `${screenshotDir}/brewlist-nightlife-${width}-hero.png` })
    }
    await page.setViewportSize({ width: 390, height: 900 })
    assert.equal((await page.goto(origin)).status(), 200)
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await assertHeroContentFits(page, '390px at 200% root text size')
    await page.goto(origin); await page.keyboard.press('Tab'); assert.equal(await page.locator('.skip-link').evaluate(el => el === document.activeElement), true)
    for (const route of ['/', '/party-planner', '/find-my-drink', '/find-my-drink/saved']) assert.equal((await page.goto(origin + route)).status(), 200)
    assert.deepEqual(errors, [])
    console.log('PASS: local hero image, no external runtime images, targets, responsive layout, keyboard FAQ/menu, skip link, routes, and zero page errors')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
