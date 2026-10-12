const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE)
const origin = 'http://127.0.0.1:3145', upstreamOrigin = 'http://127.0.0.1:3144'
const id = 'dn-cape-codder'
const recipes = JSON.parse(fs.readFileSync('output/recipe-launch/remote-before.json', 'utf8')).rows.map(row => ({ ...row, status: 'published', editorial_ready: true, recipe_quality_issues: [] }))
const state = { saved: null, liked: false, review: null, comments: [] }
const errors = [], requests = []
const send = (res, value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Range': Array.isArray(value) && value.length ? `0-${value.length - 1}/${value.length}` : '*/0' }); res.end(JSON.stringify(value)) }
const upstream = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, upstreamOrigin), method = req.method
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : null
    const table = url.pathname.split('/').pop(), authed = req.headers.authorization === 'Bearer test-access'
    requests.push({ table, method, body })
    if (url.pathname === '/auth/v1/user') return send(res, authed ? { id: '00000000-0000-4000-8000-000000000001' } : {}, authed ? 200 : 401)
    if (url.pathname === '/auth/v1/otp') { assert.equal(body.phone, '+919876543210'); return send(res, {}) }
    if (url.pathname === '/auth/v1/verify') { assert.equal(body.token, '123456'); return send(res, { access_token: 'test-access', refresh_token: 'test-refresh' }) }
    if (url.pathname === '/auth/v1/logout') return send(res, {})
    if (!url.pathname.startsWith('/rest/v1/')) return send(res, {}, 404)
    if (table === 'drinks') {
      let rows = recipes
      const filter = url.searchParams.get('id')
      if (filter) { const target = filter.slice(filter.indexOf('.') + 1).replace(/^"|"$/g, ''); rows = rows.filter(row => filter.startsWith('neq.') ? row.id !== target : row.id === target) }
      for (const key of ['base_spirit', 'alcohol_type']) { const filter = url.searchParams.get(key); if (filter?.startsWith('eq.')) rows = rows.filter(row => row[key] === filter.slice(3).replace(/^"|"$/g, '')) }
      return send(res, rows)
    }
    if (table === 'drink_social_stats') return send(res, [{ likes: Number(state.liked), reviews: Number(state.review?.moderation_status === 'approved'), average_rating: state.review?.moderation_status === 'approved' ? state.review.rating : null }])
    if (table === 'drink_reviews_public') return send(res, state.review?.moderation_status === 'approved' ? [{ id: 'public-review', rating: state.review.rating, body: state.review.body }] : [])
    if (table === 'drink_comments_public') return send(res, state.comments.filter(row => row.moderation_status === 'approved').map(({ id, kind, body }) => ({ id, kind, body })))
    if (!authed) return send(res, {}, 403)
    if (body && table !== 'profiles') { assert.equal(Object.hasOwn(body, 'user_id'), false); assert.equal(Object.hasOwn(body, 'moderation_status'), false) }
    if (table === 'profiles') return send(res, {}, 201)
    if (table === 'saved_drinks') {
      if (method === 'POST') state.saved ??= { drink_id: id, note: null }
      if (method === 'PATCH' && state.saved) state.saved.note = body.note
      if (method === 'DELETE') state.saved = null
      return send(res, method === 'POST' ? {} : state.saved ? [state.saved] : [], method === 'POST' ? 201 : 200)
    }
    if (table === 'drink_likes') { if (method === 'POST') state.liked = true; if (method === 'DELETE') state.liked = false; return send(res, state.liked ? [{ drink_id: id }] : []) }
    if (table === 'drink_reviews') {
      if (method === 'PATCH' && state.review) state.review = { ...body, moderation_status: 'pending' }
      if (method === 'POST') state.review = { rating: body.rating, body: body.body, moderation_status: 'pending' }
      if (method === 'DELETE') state.review = null
      return send(res, method === 'POST' ? {} : state.review ? [state.review] : [], method === 'POST' ? 201 : 200)
    }
    if (table === 'drink_comments') {
      if (method === 'POST') state.comments.push({ id: '00000000-0000-4000-8000-000000000003', kind: body.kind, body: body.body, moderation_status: 'pending' })
      if (method === 'DELETE') state.comments = []
      return send(res, method === 'POST' ? {} : state.comments, method === 'POST' ? 201 : 200)
    }
    return send(res, {}, 404)
  } catch (error) { errors.push(error.message); send(res, {}, 500) }
})
async function main() {
  await new Promise(resolve => upstream.listen(3144, '127.0.0.1', resolve))
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3145'], { env: { ...process.env, SUPABASE_URL: upstreamOrigin, SUPABASE_ANON_KEY: 'test-only' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let logs = '', browser
  server.stdout.on('data', data => { logs += data }); server.stderr.on('data', data => { logs += data })
  try {
    for (let n = 0; n < 60; n++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(resolve => setTimeout(resolve, 250)) }
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true })
    const context = await browser.newContext(), page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 390, height: 900 })
    await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(`${origin}/find-my-drink`)
    await page.getByRole('heading', { name: 'One quick check' }).waitFor()
    await context.addCookies([{ name: 'allcheers_eligible', value: '1', url: origin }])
    await page.goto(`${origin}/find-my-drink`)
    assert.equal(await page.locator('a[href="/find-my-drink/dn-cape-codder"]').count() > 0, true)
    await page.goto(`${origin}/find-my-drink/${id}`)
    await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
    await page.getByRole('heading', { name: 'Sign in to save your recipes' }).waitFor()
    await page.getByLabel('Phone number').fill('+919876543210')
    await page.getByRole('button', { name: 'Send code', exact: true }).click()
    await page.getByLabel('Six-digit SMS code').fill('123456')
    await page.getByRole('button', { name: 'Verify and continue', exact: true }).click()
    await page.getByRole('heading', { name: 'Sign in to save your recipes' }).waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
    await page.getByRole('button', { name: 'Saved', exact: true }).waitFor()
    await page.getByLabel('Private note').fill('Actual private note')
    await page.getByRole('button', { name: 'Save private note', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Saved.' }).waitFor()
    assert.equal(state.saved.note, 'Actual private note')
    await page.getByRole('button', { name: 'Like', exact: true }).click()
    await page.getByRole('button', { name: 'Liked', exact: true }).waitFor()
    await page.getByLabel('Rating (1 to 5)').selectOption('5')
    await page.getByLabel('Review', { exact: true }).fill('First review')
    await page.getByRole('button', { name: 'Submit review', exact: true }).click()
    await page.getByRole('button', { name: 'Update review', exact: true }).waitFor()
    assert.equal(state.review.body, 'First review')
    await page.getByLabel('Review', { exact: true }).fill('Edited review')
    await page.getByRole('button', { name: 'Update review', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Review submitted and pending moderation.' }).waitFor()
    assert.equal(state.review.body, 'Edited review')
    await page.getByLabel('Write a comment').fill('Real useful tip')
    await page.getByRole('button', { name: 'tip', exact: true }).click()
    await page.getByRole('button', { name: 'Post tip', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).waitFor()
    assert.equal(state.comments[0].body, 'Real useful tip')
    assert.equal(await page.getByRole('heading', { name: 'Reviews from the community' }).count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'Community comments', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Step mode', exact: true }).click()
    await page.getByText('Step 1 of 3', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByText('Step 2 of 3', { exact: true }).waitFor()
    fs.mkdirSync('output/playwright/recipe-platform', { recursive: true })
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${width}`)
      for (const label of ['Saved', 'Liked', 'Exit step mode']) { const box = await page.getByRole('button', { name: label, exact: true }).boundingBox(); assert.ok(box.height >= 44, label) }
      await page.screenshot({ path: `output/playwright/recipe-platform/detail-${width}.png`, fullPage: true })
    }
    await page.getByRole('button', { name: 'Delete review', exact: true }).click()
    await page.getByRole('button', { name: 'Submit review', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('heading', { name: 'Your comments', exact: true }).waitFor({ state: 'hidden' })
    await page.goto(`${origin}/find-my-drink/saved`)
    await page.getByText('Actual private note', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await page.getByText('No saved recipes yet. Save one from a recipe page.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await page.getByLabel('Phone number').waitFor()
    assert.equal(await page.getByText('Actual private note', { exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    console.log('PASS: production browser — gate, mocked OTP, save/private note/like, review edit, pending tip, making controls, deletions, saved list, signout, 320/390/1440px and no page errors')
  } finally {
    if (browser) await browser.close()
    server.kill(); server.unref(); upstream.closeAllConnections(); upstream.close()
    fs.mkdirSync('output/playwright/recipe-platform', { recursive: true }); fs.writeFileSync('output/playwright/recipe-platform/server.log', logs)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
