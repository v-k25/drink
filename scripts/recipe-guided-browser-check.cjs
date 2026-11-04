// Find a Drink and Surprise me, fixture-only production check (recipes and the planner_products snapshot). Run after pnpm build, with the existing
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
      if (u.origin === 'https://ojptrukzildmkilwponx.supabase.co' && u.pathname === '/rest/v1/planner_products' && (!init.method || init.method === 'GET')) {
        const all = require(process.env.SOCIFER_TEST_CATALOGUE).map(p=>({id:p.id,category:p.category,name:p.name,brand:p.brand,size_ml:p.sizeMl,price_paise:p.pricePaise})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
        const [start,end] = String(init.headers?.Range ?? '0-999').split('-').map(Number)
        const page = all.slice(start,end+1)
        return new Response(JSON.stringify(page),{status:206,headers:{'content-type':'application/json','content-range':start+'-'+(start+page.length-1)+'/'+all.length}})
      }
      fs.appendFileSync(process.env.SOCIFER_TEST_REJECTED,u.origin+u.pathname+' '+(init.method||'GET')+'\n')
      throw Error('Unexpected upstream request')
    }
  }
  fs.writeFileSync(preload, '(' + mockUpstream.toString() + ')()')
  const origin = 'http://127.0.0.1:3146'
  const server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3146'],{
    cwd:root,env:{...process.env,NODE_OPTIONS:'--require='+preload,SOCIFER_TEST_RECIPES:input,SOCIFER_TEST_REJECTED:rejected,SOCIFER_TEST_CATALOGUE:path.join(root,'app/party-planner/catalogue.json'),SUPABASE_URL:'https://ojptrukzildmkilwponx.supabase.co',SUPABASE_ANON_KEY:'test-only',SUPABASE_SECRET_KEY:'sb_secret_test-only'},stdio:'ignore',
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
    const quiz=label=>page.getByRole('button',{name:new RegExp('^'+label)}).click()
    const title=page.locator('#spirit-title')
    const unresolvedMocktails=['mm-blood-orange-mocktail','mm-fig-mocktail','mm-quick-cranberry-mocktail','mm-vodka-mocktail']
    async function layout(label) {
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow')
      const small=await page.locator('main button, main a, main summary').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<43.5}).map(n=>n.textContent.trim()))
      assert.deepEqual(small,[],label+' targets')
    }
    // Find a Drink (tools redesign, TR3): four questions on one page; the spirit, cocktail ideas and bottles update as you answer.
    const legend=text=>page.locator('legend',{hasText:text})
    const ideaLinks=page.locator('section[aria-labelledby="ideas-title"] article h3 a')
    const bottlesTitle=page.locator('#bottles-title')
    const prices=async(scope='section[aria-labelledby="bottles-title"] > ul:first-of-type')=>(await page.locator(scope+' li b').allTextContents()).map(t=>Number(t.replace(/[^\d]/g,'')))
    await page.goto(origin+'/find-my-drink')
    await page.getByRole('heading',{name:'Find a Drink',level:1}).waitFor()
    await page.waitForTimeout(1500) // let the answers hydrate before clicking
    assert.equal(await page.locator('fieldset').first().locator('button[aria-pressed="true"]').count(),0,'no preselected alcohol answer')
    assert.equal(await page.getByRole('button',{name:'No limit',exact:true}).getAttribute('aria-pressed'),'true','no budget limit until one is chosen')
    for(const text of ['1 · Drinking alcohol?','2 · Which flavours? Up to two','3 · How do you like it?','4 · Budget for one bottle (750 ml)'])assert.equal(await legend(text).count(),1,text)
    await page.getByText('Pick a flavour or two to narrow it down.',{exact:true}).waitFor()
    await quiz('Yes')
    await page.getByRole('button',{name:'Herbal',exact:true}).click()
    await page.getByRole('button',{name:'Citrusy',exact:true}).click()
    await page.getByRole('button',{name:'Sweet',exact:true}).click()
    assert.equal(await page.getByRole('button',{name:'Herbal',exact:true}).getAttribute('aria-pressed'),'false','two flavours at most: the oldest drops')
    await page.getByRole('button',{name:'Sweet',exact:true}).click()
    await page.getByRole('button',{name:'Herbal',exact:true}).click()
    await quiz('Light')
    assert.equal(await title.textContent(),'Gin')
    await page.getByText('Citrusy and herbal, light and fresh, good with a mixer.',{exact:true}).waitFor()
    for(const [key,value]of [['drink','cocktail'],['taste','citrusy,herbal'],['feel','light']])assert.equal(new URL(page.url()).searchParams.get(key),value,'url '+key)
    assert.equal(new URL(page.url()).searchParams.get('serve'),null,'no separate serve answer')
    assert.equal(await ideaLinks.count(),3,'three cocktail ideas')
    for(const text of await page.locator('section[aria-labelledby="ideas-title"] article').allTextContents())assert.match(text,/Gin/i,'gin cocktails')
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#spirit-title,#bottles-title,#ideas-title')].map(n=>n.id)),['spirit-title','bottles-title','ideas-title'],'ideas come after the bottles')
    assert.match(await bottlesTitle.textContent(),/^\d+ gins$/)

    await page.getByRole('button',{name:'Under ₹1,000',exact:true}).click()
    assert.equal(new URL(page.url()).searchParams.get('budget'),'u1')
    assert.match(await bottlesTitle.textContent(),/^\d+ gins under ₹1,000$/)
    const cheap=await prices()
    assert.ok(cheap.length>=2&&cheap.every(p=>p<1000),'bottles in the band')
    await page.getByRole('heading',{name:'Just over your budget'}).waitFor()
    const over=await prices('section[aria-labelledby="bottles-title"] > ul:last-of-type')
    assert.ok(over.length===3&&over.every(p=>p>=930),'just over: three dearer bottles') // 700 ml bottles count by their 750 ml price
    await page.getByLabel('Sort').selectOption('low')
    const low=await prices()
    assert.deepEqual(low,[...low].sort((a,b)=>a-b),'price low to high')
    await page.getByLabel('Sort').selectOption('high')
    const high=await prices()
    assert.deepEqual(high,[...high].sort((a,b)=>b-a),'price high to low')
    const total=cheap.length
    await page.getByRole('button',{name:'Brand and size'}).click()
    const dialog=page.getByRole('dialog',{name:'Brand and size'})
    await dialog.waitFor()
    const brandButton=dialog.locator('fieldset',{hasText:'Brand'}).getByRole('button').first()
    const brandCount=Number((await brandButton.locator('span').textContent()).trim())
    await brandButton.click()
    await dialog.getByRole('button',{name:new RegExp('^Show '+brandCount+' bottles?$')}).click()
    assert.equal(await bottlesTitle.textContent(),brandCount+' of '+total+' gins under ₹1,000')
    assert.match(await page.getByRole('button',{name:/^Brand and size/}).textContent(),/· 1$/)
    await page.getByRole('button',{name:/^Brand and size/}).click()
    await dialog.getByRole('button',{name:'Clear',exact:true}).click()
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    assert.equal(await bottlesTitle.textContent(),total+' gins under ₹1,000')

    const tryButton=page.getByRole('button',{name:/^Try .+ instead$/})
    const other=(await tryButton.textContent()).replace(/^Try (.+) instead$/,'$1')
    await tryButton.click()
    assert.equal((await title.textContent()).toLowerCase(),other)
    assert.equal(new URL(page.url()).searchParams.get('spirit'),other)
    await page.getByRole('button',{name:'Back to gin',exact:true}).click()
    assert.equal(new URL(page.url()).searchParams.get('spirit'),null)

    await ideaLinks.first().click()
    await page.getByRole('button',{name:'Start making'}).click()
    await page.getByRole('button',{name:'Next',exact:true}).click()
    await page.getByRole('button',{name:'View all steps'}).click()
    await page.getByRole('link',{name:'Back to results',exact:false}).click()
    await title.waitFor()
    for(const [key,value]of [['drink','cocktail'],['taste','citrusy,herbal'],['feel','light'],['budget','u1']])assert.equal(new URL(page.url()).searchParams.get(key),value,'detail return '+key)
    assert.equal(await title.textContent(),'Gin')

    // The budget feeds the pick: a spirit needs two bottles in the band.
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&taste=sweet&feel=rich&budget=u1')
    assert.equal(await title.textContent(),'Whisky','one brandy under ₹1,000 is not enough')
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&taste=sweet&feel=rich&budget=b4')
    assert.equal(await title.textContent(),'Brandy')
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&taste=bitter&budget=u1')
    assert.equal(await title.textContent(),'Beer')
    await page.getByText('We don’t have beer recipes yet.',{exact:true}).waitFor()
    assert.match(await bottlesTitle.textContent(),/^\d+ beers under ₹1,000$/)
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&spirit=wine')
    assert.equal(await ideaLinks.count(),1)
    assert.ok((await ideaLinks.first().textContent()).includes('Mimosa')) // read the source text
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&taste=citrusy&budget=o4&serve=neat&occasion=party')
    await title.waitFor() // old serve and occasion links still open

    // Not drinking: no spirit, no how or budget questions, mocktail ideas only.
    await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&taste=fruity&feel=light&budget=b2')
    await page.waitForTimeout(1500)
    await quiz('No, mocktails')
    assert.equal(await page.locator('#spirit-title').count(),0,'no spirit for mocktails')
    assert.equal(await legend('How do you like it?').count()+await legend('Budget for one bottle').count()+await bottlesTitle.count(),0,'how, budget and bottles hidden')
    await page.getByRole('heading',{name:'Mocktail ideas'}).waitFor()
    const mocktailIds=await ideaLinks.evaluateAll(nodes=>nodes.map(n=>decodeURIComponent(new URL(n.href).pathname.split('/').pop())))
    assert.ok(mocktailIds.length>0&&mocktailIds.length<=6)
    for(const id of mocktailIds)assert.ok(id.startsWith('mm-')&&!unresolvedMocktails.includes(id),'reviewed mocktails only')
    for(const key of ['feel','budget'])assert.equal(new URL(page.url()).searchParams.get(key),null,'mocktails drop '+key)

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
    await page.getByRole('link',{name:/Back to Find a Drink/}).click()
    await page.getByRole('heading',{name:'Find a Drink',level:1}).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('base'),'gin','answers survive switching modes')

    for(const width of [360,390,768,1024,1440]){
      await page.setViewportSize({width,height:844})
      for(const url of ['','?mode=guided&drink=cocktail&taste=herbal,citrusy&feel=light&budget=u1','?mode=guided&drink=cocktail&taste=bitter&feel=rich&budget=o4','?mode=guided&drink=mocktail&taste=fruity']){
        await page.goto(origin+'/find-my-drink'+url)
        await page.locator('h1').waitFor()
        await layout(url+' '+width)
      }
      await page.goto(origin+'/find-my-drink?mode=guided&drink=cocktail&taste=herbal,citrusy&feel=light&budget=u1')
      await title.waitFor()
      if(width>=1024){ // the answers stay in view while the results scroll
        await page.evaluate(()=>scrollTo(0,1200))
        const top=await page.getByRole('region',{name:'Your answers'}).evaluate(n=>n.getBoundingClientRect().top)
        assert.ok(await page.evaluate(()=>scrollY>600)&&top>=76&&top<=110,width+' sticky panel at '+top)
        await page.evaluate(()=>scrollTo(0,0))
      }
      await page.screenshot({path:path.join(output,'results-'+width+'.png'),fullPage:true})
      await page.goto(origin+'/find-my-drink?mode=guided&drink=mocktail&taste=fruity')
      await page.screenshot({path:path.join(output,'mocktails-'+width+'.png'),fullPage:true})
    }
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:500})
      for(const url of ['','?mode=guided&drink=cocktail&taste=herbal,citrusy&feel=light&budget=u1']){
        await page.goto(origin+'/find-my-drink'+url)
        await page.locator('h1').waitFor()
        await page.evaluate(()=>document.documentElement.style.fontSize='200%')
        await layout('expanded text '+url+' '+width)
        await page.screenshot({path:path.join(output,'text-200-short-'+width+'.png'),fullPage:true})
        await page.evaluate(()=>document.documentElement.style.fontSize='')
      }
    }
    fs.writeFileSync(input,JSON.stringify(fixture.filter(r=>r.id==='dn-mimosa')))
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=mocktail')
    await page.getByText('No mocktail recipes are available for Surprise me.',{exact:true}).waitFor()
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=cocktail')
    await page.getByText('This is the only cocktail recipe.',{exact:true}).waitFor()
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
    await plain.getByRole('link',{name:'Browse all recipes',exact:true}).click()
    await plain.getByLabel('Search by name or ingredient').fill('grapefruit')
    await plain.getByRole('button',{name:'Search',exact:true}).click()
    const plainCards=await plain.locator('article').allTextContents() // names render in capitals; read the source text
    const grapefruitNames=fixture.filter(r=>/grapefruit/i.test(r.name)||r.ingredients.some(i=>/grapefruit/i.test(i))).map(r=>r.name)
    assert.ok(plainCards.length>0&&plainCards.every(t=>grapefruitNames.some(name=>t.includes(name))))
    await nojs.close()
    await context.clearCookies()
    await page.goto(origin+'/find-my-drink?mode=random&randomDrink=mocktail')
    assert.equal(await page.getByRole('heading',{name:'Surprise me'}).count(),0,'eligibility gate')
    assert.deepEqual(errors,[],'no page errors')
    assert.ok(!fs.existsSync(rejected),'fixture rejects unexpected requests and all writes')
    console.log('PASS: Find a Drink (four questions, live spirit, cocktail ideas, bottles by budget, sort, brand and size filter, just over, try instead, budget-driven pick, no-recipe match, mocktails), detail return, random, gate, invalid, no-JS, storage; fixture production at five widths, short 200% text. Screenshots: '+output)
  } finally {
    await browser?.close()
    server.kill()
    server.unref()
    for(const file of [input,preload,rejected])if(fs.existsSync(file))fs.unlinkSync(file)
    fs.rmdirSync(temp)
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
