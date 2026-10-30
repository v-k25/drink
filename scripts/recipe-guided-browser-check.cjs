// Fixture-only production check. Run after pnpm build, with the existing
// PLAYWRIGHT_MODULE and PLAYWRIGHT_CHROMIUM_EXECUTABLE environment settings.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawn } = require('node:child_process')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const root = path.resolve(__dirname, '..')
  const fixture = require('./fixtures/guided-discovery/recipes.json')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'socifer-guided-'))
  const input = path.join(temp, 'recipes.json')
  const rejected = path.join(temp, 'rejected.txt')
  const preload = path.join(temp, 'upstream.cjs')
  const output = path.join(root, 'output/playwright/finder-guided')
  fs.mkdirSync(output, { recursive: true })
  fs.writeFileSync(input, JSON.stringify(fixture))
  function mockUpstream() {
    const fs = require('node:fs')
    const fields = {baseSpirit:'base_spirit',alcoholType:'alcohol_type',ingredientDetails:'ingredient_details',recipeYield:'recipe_yield',preparationMethod:'preparation_method',prepTimeMin:'prep_time_min',iceType:'ice_type',hasCaffeine:'has_caffeine',sourceName:'source_name',sourceUrl:'source_url',sourceRetrievedAt:'source_retrieved_at',contentOrigin:'content_origin',imageUrl:'image_url',imageAlt:'image_alt'}
    global.fetch = async (url,init={}) => {
      const u = new URL(typeof url === 'string' ? url : url.url)
      if (u.origin === 'https://ojptrukzildmkilwponx.supabase.co' && u.pathname === '/rest/v1/drinks' && (!init.method || init.method === 'GET')) {
        let rows = JSON.parse(fs.readFileSync(process.env.SOCIFER_TEST_RECIPES,'utf8')).map(r=>Object.fromEntries(Object.entries({status:'published',editorial_ready:true,recipe_quality_issues:[],...r}).map(([key,value])=>[fields[key]||key,value])))
        for (const [key,value] of u.searchParams) {
          if (key === 'id' && value.startsWith('eq.')) rows = rows.filter(r=>r.id===value.slice(3))
          if (key === 'id' && value.startsWith('neq.')) rows = rows.filter(r=>r.id!==value.slice(4))
          if ((key === 'base_spirit' || key === 'alcohol_type') && value.startsWith('eq.')) rows = rows.filter(r=>r[key]===value.slice(3))
        }
        return new Response(JSON.stringify(rows),{status:200,headers:{'content-type':'application/json','content-range':rows.length?'0-'+(rows.length-1)+'/'+rows.length:'*/0'}})
      }
      fs.appendFileSync(process.env.SOCIFER_TEST_REJECTED,u.origin+u.pathname+' '+(init.method||'GET')+'\n')
      throw Error('Unexpected upstream request')
    }
  }
  fs.writeFileSync(preload, '(' + mockUpstream.toString() + ')()')
  const origin = 'http://127.0.0.1:3146'
  const server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3146'],{
    cwd:root,env:{...process.env,NODE_OPTIONS:'--require='+preload,SOCIFER_TEST_RECIPES:input,SOCIFER_TEST_REJECTED:rejected,SUPABASE_URL:'https://ojptrukzildmkilwponx.supabase.co',SUPABASE_ANON_KEY:'test-only'},stdio:'ignore',
  })
  let browser
  try {
    let ready=false
    for(let n=0;n<60;n++){try{await fetch(origin);ready=true;break}catch{await new Promise(r=>setTimeout(r,250))}}
    assert.ok(ready,'production server ready')
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE})
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
    await context.addCookies([{name:'allcheers_eligible',value:'1',url:origin}])
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
    const page=await context.newPage(), errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    const results=type=>page.locator('section[aria-labelledby="guided-'+type+'"]')
    const cards=type=>results(type).locator('article')
    async function editor() {
      if(page.viewportSize().width>=1024)return page.getByRole('complementary',{name:'Edit preferences'})
      await page.getByRole('button',{name:'Edit preferences',exact:true}).click()
      const dialog=page.getByRole('dialog',{name:'Edit preferences'})
      await dialog.waitFor()
      assert.ok(await dialog.evaluate(n=>n.matches(':modal')))
      return dialog
    }
    async function layout(label) {
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow')
      const small=await page.locator('main button, main a, main summary').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<43.5}).map(n=>n.textContent.trim()))
      assert.deepEqual(small,[],label+' targets')
    }
    await page.goto(origin+'/find-my-drink')
    await page.getByRole('button',{name:'Guide me'}).click()
    assert.equal(await page.locator('fieldset button[aria-pressed="true"]').count(),0,'no preselected type')
    await page.getByRole('button',{name:'Both',exact:true}).click()
    await page.getByRole('button',{name:'Creamy',exact:true}).click()
    await page.getByRole('button',{name:'Show drinks',exact:true}).click()
    assert.equal(await cards('cocktail').count(),3)
    assert.equal(await cards('mocktail').count(),3)
    let form=await editor()
    await form.getByRole('button',{name:/^Gin: /}).click()
    await form.getByRole('button',{name:'Apply'}).click()
    assert.equal(new URL(page.url()).searchParams.get('base'),'gin')
    assert.equal(await cards('mocktail').count(),3,'mixed base preserves mocktails')
    form=await editor()
    await form.getByRole('button',{name:'Mocktail',exact:true}).click()
    await form.getByText('Base cleared:',{exact:false}).waitFor()
    await form.getByRole('button',{name:'Cancel',exact:true}).click()
    assert.equal(new URL(page.url()).searchParams.get('drink'),'mixed','Cancel retains preferences')
    assert.ok(await page.getByRole('button',{name:'Edit preferences',exact:true}).evaluate(n=>n===document.activeElement),'Cancel restores focus')
    form=await editor()
    await page.keyboard.press('Escape')
    await form.waitFor({state:'hidden'})
    assert.ok(await page.getByRole('button',{name:'Edit preferences',exact:true}).evaluate(n=>n===document.activeElement),'Escape restores focus')
    await cards('cocktail').first().getByRole('link').click()
    await page.getByRole('button',{name:'Start making'}).click()
    await page.getByRole('button',{name:'Next',exact:true}).click()
    await page.getByRole('button',{name:'View all steps'}).click()
    await page.getByRole('link',{name:'Back to results',exact:false}).click()
    await results('cocktail').waitFor()
    for(const [key,value]of [['drink','mixed'],['taste','creamy'],['base','gin']])assert.equal(new URL(page.url()).searchParams.get(key),value,'detail return '+key)

    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&base=gin&taste=bitter&q=Negroni')
    form=await editor()
    await form.getByText('Ingredients I have (0)',{exact:false}).click()
    for(const label of ['Gin','Sweet Vermouth','Orange slice','Ice'])await form.getByLabel(label,{exact:true}).check()
    await form.getByRole('button',{name:'Apply'}).click()
    await page.getByText('Missing Campari: 1 oz. Campari.',{exact:true}).waitFor()
    form=await editor()
    await form.getByText('Ingredients I have (4)',{exact:false}).click()
    await form.getByLabel('Campari',{exact:true}).check()
    await form.getByRole('button',{name:'Apply'}).click()
    await page.getByText('Uses your selected ingredients; check quantities and equipment.',{exact:true}).waitFor()
    form=await editor()
    await form.getByText('Ingredients I have (5)',{exact:false}).click()
    await form.getByLabel('Ice',{exact:true}).uncheck()
    await form.getByRole('button',{name:'Apply'}).click()
    assert.equal(await page.getByText('All required ingredients selected',{exact:true}).count(),0)
    assert.equal(await page.getByText('One ingredient away',{exact:true}).count(),0,'unmeasured ice is not one-away')

    await page.goto(origin+'/find-my-drink?mode=guided&drink=mixed&base=beer')
    await results('cocktail').getByText('We don’t have beer recipes yet.',{exact:true}).waitFor()
    assert.equal(await cards('mocktail').count(),3)
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&base=champagne')
    assert.equal(await cards('cocktail').count(),1)
    assert.ok((await cards('cocktail').first().innerText()).includes('Mimosa'))
    await page.evaluate(()=>sessionStorage.clear())
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=mocktail&drink=cocktail&base=gin&q=no-such-recipe&pick=dn-negroni')
    const seen=new Set(), unresolved=['mm-blood-orange-mocktail','mm-fig-mocktail','mm-quick-cranberry-mocktail','mm-vodka-mocktail']
    for(let i=0;i<11;i++){
      const article=page.getByRole('region',{name:'Random recipe'}).locator('article')
      await article.waitFor()
      const id=(await article.getAttribute('id')).slice(7)
      assert.ok(id.startsWith('mm-')&&!unresolved.includes(id)&&!seen.has(id),'reviewed type-only draw without repeat')
      seen.add(id)
      if(i<10)await page.getByRole('button',{name:'Pick for me',exact:true}).click()
    }
    await page.getByRole('button',{name:'Start again',exact:true}).click()
    assert.equal(await page.getByRole('region',{name:'Random recipe'}).locator('article').count(),1)
    await page.getByRole('button',{name:'Guide me',exact:true}).click()
    assert.equal(new URL(page.url()).searchParams.get('base'),'gin')
    assert.equal(new URL(page.url()).searchParams.get('q'),'no-such-recipe')

    for(const width of [360,390,768,1024,1440]){
      await page.setViewportSize({width,height:844})
      await page.evaluate(()=>sessionStorage.clear())
      await page.goto(origin+'/find-my-drink?mode=guided&drink=mixed&taste=creamy')
      await results('mocktail').waitFor()
      await layout('results '+width)
      await page.screenshot({path:path.join(output,'results-'+width+'.png'),fullPage:true})
      if(width<1024){form=await editor();for(let i=0;i<14;i++){await page.keyboard.press('Tab');assert.ok(await form.evaluate(n=>n.contains(document.activeElement)),'modal traps Tab')}await form.getByRole('button',{name:'Cancel',exact:true}).click()}
    }
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:500})
      await page.evaluate(()=>document.documentElement.style.fontSize='200%')
      await layout('expanded text '+width)
      form=await editor()
      await form.getByRole('button',{name:'Apply'}).scrollIntoViewIfNeeded()
      assert.ok(await form.getByRole('button',{name:'Apply'}).isVisible(),'Apply reachable at short height and 200% text')
      await page.screenshot({path:path.join(output,'text-200-short-'+width+'.png'),fullPage:true})
      await form.getByRole('button',{name:'Cancel',exact:true}).click()
      await page.evaluate(()=>document.documentElement.style.fontSize='')
    }
    fs.writeFileSync(input,JSON.stringify(fixture.filter(r=>r.id==='dn-mimosa')))
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=mocktail')
    await page.getByText('No mocktail recipes are available for Surprise me.',{exact:true}).waitFor()
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=cocktail')
    await page.getByText('This is the only eligible recipe for this drink type.',{exact:true}).waitFor()
    await page.getByRole('region',{name:'Random recipe'}).getByRole('link',{name:'Mimosa'}).waitFor()
    fs.writeFileSync(input,JSON.stringify([{...fixture[0],status:'draft'}]))
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail')
    await page.getByText('Recipes are temporarily unavailable',{exact:true}).waitFor()
    fs.writeFileSync(input,JSON.stringify(fixture))

    const blocked=await browser.newContext({viewport:{width:390,height:844}})
    await blocked.addCookies([{name:'allcheers_eligible',value:'1',url:origin}])
    await blocked.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw Error('blocked')}}))
    await blocked.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
    const blockedPage=await blocked.newPage()
    blockedPage.on('pageerror',e=>errors.push(e.message))
    await blockedPage.goto(origin+'/find-my-drink?mode=random&randomDrink=mocktail')
    await blockedPage.getByRole('region',{name:'Random recipe'}).locator('article').waitFor()
    await blockedPage.getByRole('button',{name:'Pick for me'}).click()
    await blocked.close()
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}})
    await nojs.addCookies([{name:'allcheers_eligible',value:'1',url:origin}])
    await nojs.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort())
    const plain=await nojs.newPage()
    await plain.goto(origin+'/find-my-drink')
    await plain.getByRole('link',{name:'Browse and filter all published recipes'}).click()
    await plain.getByLabel('Search by name or ingredient').fill('grapefruit')
    await plain.getByRole('button',{name:'Search',exact:true}).click()
    const plainCards=await plain.locator('article').allInnerTexts()
    const grapefruitNames=fixture.filter(r=>/grapefruit/i.test(r.name)||r.ingredients.some(i=>/grapefruit/i.test(i))).map(r=>r.name)
    assert.ok(plainCards.length>0&&plainCards.every(t=>grapefruitNames.some(name=>t.includes(name))))
    await nojs.close()
    await context.clearCookies()
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=mocktail')
    assert.equal(await page.getByRole('heading',{name:'Surprise me'}).count(),0,'eligibility gate')
    assert.deepEqual(errors,[],'no page errors')
    assert.ok(!fs.existsSync(rejected),'fixture rejects unexpected requests and all writes')
    console.log('PASS: guided/mixed/edit/focus/ingredients/detail/random/gate/invalid/no-JS/storage; fixture production at five widths, short 200% text. Screenshots: '+output)
  } finally {
    await browser?.close()
    server.kill()
    server.unref()
    for(const file of [input,preload,rejected])if(fs.existsSync(file))fs.unlinkSync(file)
    fs.rmdirSync(temp)
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
