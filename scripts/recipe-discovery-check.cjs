// Production, read-only UI check plus pure picker/return-URL regressions.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE)

function helpers() {
  const ts = require('typescript')
  const Module = require('node:module')
  const mod = new Module('recipe-helpers', module)
  mod._compile(ts.transpileModule(fs.readFileSync('app/find-my-drink/recipe.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, 'recipe-helpers.cjs')
  return mod.exports
}

async function main() {
  const { pickRecipeIds, safeResultsHref } = helpers()
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const seen = new Set()
  const returned = []
  for (let n = 0; n < 4; n++) {
    const picked = pickRecipeIds(ids, seen, () => 0.99)
    assert.ok(picked.length <= 3)
    assert.ok(picked.every(id => ids.includes(id) && !seen.has(id)))
    picked.forEach(id => seen.add(id))
    returned.push(...picked)
  }
  assert.equal(new Set(returned).size, 8)
  assert.deepEqual(pickRecipeIds(ids, seen), [])
  assert.deepEqual(pickRecipeIds([], new Set()), [])
  assert.equal(safeResultsHref('/find-my-drink?mode=browse&drink=mocktail&q=lime#recipe-a'), '/find-my-drink?mode=browse&drink=mocktail&q=lime#recipe-a')
  for (const url of ['https://evil.test/find-my-drink', '//evil.test/find-my-drink', 'javascript:alert(1)', '/other', '/find-my-drink/recipe', '/\\evil.test/find-my-drink', undefined, 'x'.repeat(4001)]) {
    assert.equal(safeResultsHref(url), '/find-my-drink')
  }

  const origin = 'http://127.0.0.1:3140'
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3140'], { stdio: 'ignore' })
  let browser
  try {
    let ready = false
    for (let n = 0; n < 60; n++) {
      try { await fetch(origin); ready = true; break } catch { await new Promise(resolve => setTimeout(resolve, 250)) }
    }
    assert.ok(ready, 'test-owned production server ready')
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true })
    const context = await browser.newContext()
    await context.addCookies([{ name: 'allcheers_eligible', value: '1', url: origin }])
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const evidence = 'output/playwright/finder-ux-phase1'
    fs.mkdirSync(evidence, { recursive: true })
    const choiceIds = () => page.locator('section[aria-labelledby="choices-title"] article').evaluateAll(articles => articles.map(article => article.id.replace('recipe-', '')))
    async function settlePhotos() {
      await page.evaluate(async () => {
        for (const image of document.querySelectorAll('main img')) image.loading = 'eager'
        await Promise.all([...document.querySelectorAll('main img')].map(image => image.decode().catch(() => {})))
      })
    }
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${origin}/find-my-drink?mode=browse`)
      await page.getByRole('button', { name: 'Pick for me', exact: true }).waitFor()
      assert.equal(await page.getByRole('heading', { name: 'What sounds good?' }).count(), 1)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `listing overflow ${width}`)
      const cards = await page.locator('article').evaluateAll(articles => articles.map(article => article.id))
      assert.equal(new Set(cards).size, cards.length, 'no duplicated initial recommendation or full-browse cards')
      assert.equal((await choiceIds()).length, 3)
      const searchBox = await page.getByLabel('Search by name or ingredient').boundingBox()
      if (width < 800) assert.ok(searchBox.y + searchBox.height < 600, 'compact entry keeps search above first substantial scroll')
      for (const element of await page.locator('main a, main button, summary').all()) {
        const box = await element.boundingBox()
        if (box?.height) assert.ok(box.height >= 43.5, `target under 44px at ${width}: ${await element.evaluate(el => el.outerHTML)} / ${JSON.stringify(box)}`)
      }
      await settlePhotos()
      await page.screenshot({ path: `${evidence}/listing-${width}.png`, fullPage: true, animations: 'disabled' })
      await page.screenshot({ path: `${evidence}/listing-viewport-${width}.png`, animations: 'disabled' })
      // <=800px: a Filters button opens the "Refine matches" dialog; wider: facets sit inline in the aside.
      const filterLinks = width <= 800 ? page.locator('dialog[open] a') : page.locator('aside[aria-label="Recipe refinement"] a:visible')
      if (width <= 800) {
        await page.getByRole('button', { name: /^Filters/ }).click()
        await page.getByRole('heading', { name: 'Refine matches' }).waitFor()
      }
      assert.ok(await filterLinks.count() > 0, `filter links visible at ${width}`)
      for (const element of await filterLinks.all()) {
        const box = await element.boundingBox()
        assert.ok(box && box.height >= 43.5, `expanded filter targets are at least 44px at ${width}`)
      }
      if (width <= 800) await page.getByRole('button', { name: 'Done', exact: true }).click()
      await page.goto(`${origin}/find-my-drink/mm-roy-rogers-drink`)
      await page.getByRole('button', { name: 'Start making', exact: true }).waitFor()
      await page.locator('a[href="#ingredients"]').click()
      assert.ok(page.url().endsWith('#ingredients'))
      await page.getByRole('checkbox').first().check()
      await page.getByRole('button', { name: 'Start making', exact: true }).click()
      await page.getByText('Step 1 of 4', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Next', exact: true }).click()
      await page.getByText('Step 2 of 4', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'View all steps', exact: true }).click()
      assert.equal(await page.getByRole('checkbox').first().isChecked(), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `detail overflow ${width}`)
      await page.goto(`${origin}/find-my-drink/mm-roy-rogers-drink`)
      await page.getByRole('button', { name: 'Start making', exact: true }).waitFor()
      await settlePhotos()
      await page.screenshot({ path: `${evidence}/detail-${width}.png`, fullPage: true, animations: 'disabled' })
    }

    await page.goto(`${origin}/find-my-drink?mode=browse`)
    await page.getByRole('button', { name: 'Pick for me', exact: true }).waitFor()
    const firstPageIds = await page.locator('article').evaluateAll(articles => articles.map(article => article.id.replace('recipe-', '')))
    await page.evaluate(() => { Math.random = () => 0.99999 })
    await page.getByRole('button', { name: 'Pick for me', exact: true }).click()
    const pickedIds = await choiceIds()
    const laterPick = pickedIds.find(id => !firstPageIds.includes(id))
    assert.ok(laterPick, 'the picker genuinely selected an eligible recipe beyond page one')
    await page.locator(`#recipe-${laterPick} a`).click()
    await page.getByRole('link', { name: 'Back to recipes' }).click()
    await page.waitForURL(url => url.pathname === '/find-my-drink')
    await page.locator(`#recipe-${laterPick}`).waitFor()
    assert.ok(page.url().includes('pick='), 'returned choices are represented in the local URL')
    assert.equal(new URL(page.url()).hash, `#recipe-${laterPick}`)
    assert.ok((await page.locator(`#recipe-${laterPick}`).boundingBox()).y < 900, 'picked card is visible on return')

    await page.goto(`${origin}/find-my-drink?mode=browse&drink=mocktail`)
    await page.getByRole('button', { name: 'Pick for me', exact: true }).waitFor()
    const initial = await choiceIds()
    const mockSeen = new Set(initial)
    const count = Number((await page.locator('#ordinary-results').getByRole('status').first().innerText()).match(/^\d+/)[0])
    while (mockSeen.size < count) {
      await page.getByRole('button', { name: 'Pick for me', exact: true }).click()
      for (const id of await choiceIds()) { assert.ok(!mockSeen.has(id), 'Pick never repeats within current filtered session'); mockSeen.add(id) }
      for (const card of await page.locator('article').all()) assert.ok((await card.innerText()).includes('Mocktail'), 'all suggestions and full results respect mocktail type')
    }
    await page.getByRole('button', { name: 'Pick for me', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'All matching recipes shown' }).waitFor()
    await page.reload()
    await page.getByRole('button', { name: 'Pick for me', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'All matching recipes shown' }).waitFor()

    await page.goto(`${origin}/find-my-drink?mode=browse&drink=cocktail&q=cranberry&method=build&max=3&pick=negroni,unknown`)
    await page.getByRole('button', { name: 'Pick for me', exact: true }).waitFor()
    for (const card of await page.locator('article').all()) assert.ok((await card.innerText()).includes('Cocktail'))
    assert.ok(!(await page.locator('main').innerText()).includes('Negroni'))
    await page.locator('article a').first().click()
    await page.getByRole('link', { name: 'Back to recipes' }).click()
    await page.waitForURL(url => url.pathname === '/find-my-drink')
    for (const [key, value] of [['drink', 'cocktail'], ['q', 'cranberry'], ['method', 'build'], ['max', '3']]) assert.equal(new URL(page.url()).searchParams.get(key), value)
    await page.goto(`${origin}/find-my-drink?mode=browse&q=no-such-drink`)
    await page.getByRole('heading', { name: 'No matches just yet' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Pick for me', exact: true }).count(), 0)

    await page.goto(`${origin}/find-my-drink?mode=browse`)
    await page.locator('article a').first().focus()
    const ring = await page.locator('article').first().evaluate(article => getComputedStyle(article).outlineWidth)
    assert.equal(ring, '2px', 'full card keyboard focus ring is outside the clipping boundary')

    const blocked = await browser.newContext()
    await blocked.addCookies([{ name: 'allcheers_eligible', value: '1', url: origin }])
    await blocked.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked') } }) })
    const blockedPage = await blocked.newPage()
    blockedPage.on('pageerror', error => errors.push(error.message))
    await blockedPage.goto(`${origin}/find-my-drink?mode=browse&drink=mocktail`)
    await blockedPage.getByRole('button', { name: 'Pick for me', exact: true }).click()
    assert.equal(await blockedPage.locator('section[aria-labelledby="choices-title"] article').count(), 3)
    await blocked.close()

    const noJs = await browser.newContext({ javaScriptEnabled: false })
    await noJs.addCookies([{ name: 'allcheers_eligible', value: '1', url: origin }])
    const plainPage = await noJs.newPage()
    await plainPage.goto(`${origin}/find-my-drink?mode=browse&drink=mocktail`)
    await plainPage.getByLabel('Search by name or ingredient').fill('grapefruit')
    await plainPage.getByRole('button', { name: 'Search', exact: true }).click()
    // The 50-recipe catalogue has more than one grapefruit mocktail; every result must match the search.
    const grapefruitCards = await plainPage.locator('article').allInnerTexts()
    assert.ok(grapefruitCards.length >= 1)
    for (const text of grapefruitCards) assert.match(text, /grapefruit/i)
    await plainPage.locator('article a', { hasText: 'Grapefruit MartiNO' }).first().click()
    await plainPage.locator('a[href="#ingredients"]').click()
    assert.ok((await plainPage.locator('body').innerText()).includes('~120 mL grapefruit juice'))
    assert.equal(await plainPage.getByRole('button', { name: 'Start making', exact: true }).count(), 0)
    await noJs.close()
    assert.deepEqual(errors, [])
    console.log('PASS: live production discovery/detail at 1440/768/390/320; 44px targets, no overflow/duplicates, actual later-page pick roundtrip, filtered session exhaustion/reload, blocked storage, filter return, unknown IDs ignored, visible card focus, no-JS search/detail; zero page errors.')
  } finally {
    if (browser) await browser.close()
    server.kill()
    server.unref()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
