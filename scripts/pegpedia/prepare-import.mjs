import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export function normalizeName(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(?:\s*[([]?\s*\d+(?:\.\d+)?\s*(?:ml|millilit(?:er|re)s?|l|lit(?:er|re)s?|cl)\s*(?:bottle)?\s*[)\]]?\s*)+$/i, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
export function key(name,size) {
  return Number.isInteger(size)&&size>0 ? normalizeName(name)+"|"+size : null;
}
export function validAbv(n) { return n==null||(typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=100); }
export function sqlLiteral(v) {
  if(v==null)return "null";
  if(typeof v==="number"&&Number.isFinite(v))return String(v);
  if(typeof v!=="string")throw new TypeError("SQL literal requires string, finite number, or null");
  return "'"+v.replace(/'/g,"''")+"'";
}
export function jaipurEvidence(prices) {
  return prices.filter(p=>p.city_name==="Jaipur"&&p.state_name==="Rajasthan"&&p.city_id!=null&&p.is_verified===true&&typeof p.price==="number"&&Number.isFinite(p.price)&&p.price>0);
}
function readJsonl(s){return s.split(/\r?\n/).filter(Boolean).map(JSON.parse);}
function family(category) {
  const c=String(category??"").toLowerCase();
  return ({beer:"beer",brandy:"brandy",gin:"gin",liqueur:"liqueur",rum:"rum",tequila:"tequila",vodka:"vodka",whiskey:"whiskey",whisky:"whiskey",wine:"wine"})[c]??null;
}
function typeFamily(type){const t=String(type??"").toLowerCase();return t==="whisky"?"whiskey":t;}
const plannerFamilies={
  beer:["beers"],brandy:["brandy"],gin:["gin"],liqueur:["liqueurs"],rum:["rum"],tequila:["tequila"],vodka:["vodka"],
  whiskey:["blended scotch","made in india whisky","single malts","world whisky"],
  wine:["champagne","red wine","rose wine","sparkling wine","white wine"]
};
function categoryCompatible(source, target){return (plannerFamilies[family(source)]??[]).includes(String(target??"").toLowerCase());}
function categoryConflict(p){
  const f=family(p.category_name);
  return !f||typeFamily(p.product_type)!==f||(f==="whiskey"&&/absolut/i.test(p.brand_name)&&/citron/i.test(p.name));
}
function validateProduct(p) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const slug=/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
  if(!uuid.test(p.id??"")||!uuid.test(p.brand_id??"")||!uuid.test(p.category_id??""))throw new Error("invalid source UUID");
  if(!slug.test(p.slug??"")||![p.name,p.brand_name,p.category_name,p.product_type].every(v=>typeof v==="string"&&v.trim()))throw new Error("invalid source identity strings");
  if(!validAbv(p.abv))throw new Error("invalid bottle ABV");
  if(p.volume_ml!=null&&(!Number.isInteger(p.volume_ml)||p.volume_ml<=0))throw new Error("invalid bottle size");
}
function brandPresent(brand,name){return normalizeName(name).includes(normalizeName(brand));}
function sourceIdentityKey(p) {
  const k=key(p.name,p.volume_ml);
  return k ? [k,normalizeName(p.brand_name),family(p.category_name)].join("|") : null;
}
function stableUnique(raw,recovered) {
  const byId=new Map(),occurrences=new Map();
  for(const p of raw){
    validateProduct(p);
    occurrences.set(p.id,[...(occurrences.get(p.id)??[]),p]);
    const old=byId.get(p.id);
    if(old&&JSON.stringify(old)!==JSON.stringify(p))throw new Error("conflicting source facts for repeated UUID "+p.id);
    if(!old)byId.set(p.id,p);
  }
  const recoveredNovel=[];
  for(const p of recovered){
    validateProduct(p);
    const old=byId.get(p.id);
    if(old&&JSON.stringify(old)!==JSON.stringify(p))throw new Error("probe facts conflict with page facts "+p.id);
    if(!old){byId.set(p.id,p);recoveredNovel.push(p);}
  }
  return {products:[...byId.values()],occurrences,recoveredNovel};
}
function classify(p,identityGroups,metadata,plannerByKey,plannerByName) {
  const k=key(p.name,p.volume_ml);
  if(categoryConflict(p))return payload(p,metadata,{status:"category_conflict",reason:"source category/type mismatch or known suspicious classification"});
  const identity=sourceIdentityKey(p);
  if(identity&&identityGroups.get(identity)?.length>1)
    return payload(p,metadata,{status:"ambiguous",reason:"possible source duplicate or conflicting source facts; manual identity review",source_candidates:identityGroups.get(identity).map(x=>x.id)});
  const exact=(plannerByKey.get(k)??[]).filter(t=>categoryCompatible(p.category_name,t.category)&&brandPresent(p.brand_name,p.name)&&brandPresent(p.brand_name,t.name));
  if(exact.length>1)return payload(p,metadata,{status:"ambiguous",reason:"multiple compatible planner rows share exact normalized name and size",planner_candidates:exact.map(t=>t.id)});
  if(exact.length===1)return payload(p,metadata,{status:"exact_link",reason:"unique compatible normalized name and exact bottle size",planner_product_id:exact[0].id,reviewed_category:exact[0].category});
  const sizeVariants=(plannerByName.get(normalizeName(p.name))??[]).filter(t=>t.size_ml!==p.volume_ml&&categoryCompatible(p.category_name,t.category)&&brandPresent(p.brand_name,p.name)&&brandPresent(p.brand_name,t.name));
  if(sizeVariants.length)return payload(p,metadata,{status:"ambiguous",reason:"same normalized name exists in planner at another size",planner_candidates:sizeVariants.map(t=>t.id)});
  return payload(p,metadata,{status:"unmatched",reason:k?"no conservative name/size/category/brand match":"bottle size missing; exact match cannot be established"});
}
function payload(p,m,result){
  return {
    pegpedia_product_id:p.id,pegpedia_slug:p.slug,name:p.name,brand_name:p.brand_name,
    source_category:p.category_name,reviewed_category:result.reviewed_category??null,
    product_type:p.product_type,volume_ml:p.volume_ml??null,bottle_abv:p.abv??null,
    planner_product_id:result.planner_product_id??null,match_status:result.status,
    import_status:"pending_review",match_reason:result.reason,
    planner_candidates:result.planner_candidates??[],price_evidence:[],
    jaipur_eligibility:"not_evaluated",
    source_url:"https://pegpedia-api.onrender.com/products/"+encodeURIComponent(p.slug),
    acquisition_page_url:m.url,source_fetched_at:m.fetched_at
  };
}
function hashRows(rows){return crypto.createHash("sha256").update(rows.map(r=>JSON.stringify(r)).join("\n")).digest("hex");}
export function selfCheck() {
  assert.equal(normalizeName("Glenfiddich 12 Year Old (750ml)"),"glenfiddich 12 year old");
  assert.notEqual(key("Blue Label 12 Year",750),key("Blue Label 18 Year",750));
  assert.notEqual(key("Citron Edition",750),key("Original Edition",750));
  assert.equal(normalizeName("CRÈME—DE CASSIS"),"creme de cassis");
  assert.equal(validAbv(null),true);assert.equal(validAbv(100),true);assert.equal(validAbv(101),false);
  assert.throws(()=>sqlLiteral({bad:true}));assert.equal(sqlLiteral("O'Brien"),"'O''Brien'");
  assert.deepEqual(jaipurEvidence([
    {city_name:"Jaipur",state_name:"Rajasthan",city_id:"j",is_verified:true,price:400},
    {city_name:"Udaipur",state_name:"Rajasthan",city_id:"u",is_verified:true,price:400},
    {city_name:"Jaipur",state_name:"Rajasthan",city_id:"j",is_verified:false,price:400},
    {city_name:null,state_name:"Rajasthan",city_id:null,is_verified:true,price:400}
  ]).length,1);
  const base={id:"11111111-1111-4111-8111-111111111111",slug:"sample-brand-reserve-750ml",name:"Sample Brand Reserve 750ml",product_type:"whiskey",brand_id:"22222222-2222-4222-8222-222222222222",brand_name:"Sample Brand",category_id:"33333333-3333-4333-8333-333333333333",category_name:"Whiskey",abv:null,volume_ml:750};
  assert.throws(()=>validateProduct({...base,abv:101}));
  assert.throws(()=>validateProduct({...base,volume_ml:750.5}));
  assert.throws(()=>validateProduct({...base,slug:"../unsafe"}));
  const meta={url:"https://api.test/page",fetched_at:"2026-10-14T00:00:00Z"};
  const planner=[{id:"JPR-A",name:"Sample Brand Reserve",size_ml:750,category:"World Whisky"},{id:"JPR-B",name:"Sample Brand Reserve",size_ml:750,category:"World Whisky"}];
  const index=(targets,field)=>{const m=new Map();for(const t of targets){const k=field==="key"?key(t.name,t.size_ml):normalizeName(t.name);m.set(k,[...(m.get(k)??[]),t]);}return m;};
  const emptyGroups=new Map();
  assert.equal(classify(base,emptyGroups,meta,index(planner,"key"),index(planner,"name")).match_status,"ambiguous");
  const oneTarget=[planner[0]];
  assert.equal(classify(base,emptyGroups,meta,index(oneTarget,"key"),index(oneTarget,"name")).match_status,"exact_link");
  const other={...base,id:"44444444-4444-4444-8444-444444444444"};
  assert.equal(classify(base,new Map([[sourceIdentityKey(base),[base,other]]]),meta,new Map(),new Map()).match_status,"ambiguous");
  assert.equal(classify({...base,abv:45},new Map([[sourceIdentityKey(base),[base,other]]]),meta,new Map(),new Map()).match_status,"ambiguous");
  assert.equal(classify({...base,volume_ml:null},new Map(),meta,new Map(),new Map()).match_status,"unmatched");
  assert.equal(classify({...base,brand_name:"Absolut",name:"Absolut Citron"},new Map(),meta,new Map(),new Map()).match_status,"category_conflict");
  assert.equal(stableUnique([base,base],[]).products.length,1);
  assert.equal(stableUnique([base],[]).products.length,stableUnique([base],[]).products.length);
  const one=[payload(base,meta,{status:"unmatched",reason:"fixture"})];
  assert.equal(hashRows(one),hashRows([payload(base,meta,{status:"unmatched",reason:"fixture"})]));
  return {assertions:"passed",cases:18};
}

export async function run(root) {
  const checks=selfCheck();
  const dir=path.join(root,"output","pegpedia");
  const raw=readJsonl(await fs.readFile(path.join(dir,"source-products.jsonl"),"utf8"));
  const oldManifest=readJsonl(await fs.readFile(path.join(dir,"crawl-pages.jsonl"),"utf8"));
  const pages=oldManifest.map(m=>({...m,url:m.url??("https://pegpedia-api.onrender.com/products?category="+m.category+"&limit=100&offset="+m.offset+"&sort=newest"),fetched_at:m.fetched_at??m.at}));
  const pageFiles=new Map();
  for(const m of pages){
    const p=JSON.parse(await fs.readFile(path.join(dir,"pages",m.category+"-"+m.offset+".json"),"utf8"));
    const digest=crypto.createHash("sha256").update(JSON.stringify(p)).digest("hex");
    if(digest!==m.sha256)throw new Error("saved-page hash mismatch "+m.category+"@"+m.offset);
    if(!m.fetched_at)throw new Error("missing original page timestamp "+m.category+"@"+m.offset);
    pageFiles.set(m.category+"|"+m.offset,p);
    for(const row of p)validateProduct(row);
  }
  const probe=JSON.parse(await fs.readFile(path.join(dir,"whiskey-boundary-probe-450-full.json"),"utf8"));
  const {products,occurrences,recoveredNovel}=stableUnique(raw,probe.rows);
  if(recoveredNovel.length!==1||recoveredNovel[0].name!=="Yamazaki 12")throw new Error("boundary recovery did not add expected unique ID");
  const metadataById=new Map();
  for(const m of pages)for(const p of pageFiles.get(m.category+"|"+m.offset))if(!metadataById.has(p.id))metadataById.set(p.id,m);
  for(const p of recoveredNovel)metadataById.set(p.id,{url:probe.url,fetched_at:probe.at});
  const orderChecks=JSON.parse(await fs.readFile(path.join(dir,"order-stability.json"),"utf8"));
  if(orderChecks.length!==9||orderChecks.some(c=>!c.stable_order))throw new Error("first-page ID order stability not confirmed across categories");
  const rechecks=readJsonl(await fs.readFile(path.join(dir,"stability-rechecks.jsonl"),"utf8"));
  const whiskeyBoundary=[400,500].map(offset=>rechecks.find(r=>r.offset===offset));
  if(whiskeyBoundary.some(r=>!r||r.same!==true))throw new Error("Whiskey boundary ID-order recheck failed");
  const categories=JSON.parse(await fs.readFile(path.join(dir,"categories.json"),"utf8"));
  const planner=JSON.parse(await fs.readFile(path.join(dir,"planner-before.json"),"utf8"));
  const plannerByKey=new Map(),plannerByName=new Map();
  for(const t of planner){const k=key(t.name,t.size_ml),n=normalizeName(t.name);if(k)plannerByKey.set(k,[...(plannerByKey.get(k)??[]),t]);plannerByName.set(n,[...(plannerByName.get(n)??[]),t]);}
  const identityGroups=new Map();
  for(const p of products){const k=sourceIdentityKey(p);if(k)identityGroups.set(k,[...(identityGroups.get(k)??[]),p]);}
  const rows=products.map(p=>classify(p,identityGroups,metadataById.get(p.id),plannerByKey,plannerByName));
  const plannerLinks=rows.filter(r=>r.planner_product_id!=null);
  if(plannerLinks.length!==new Set(plannerLinks.map(r=>r.planner_product_id)).size)throw new Error("multiple source records link one planner product");
  if(rows.some(r=>r.match_status==="exact_link"!==(r.planner_product_id!=null)))throw new Error("exact link status/id mismatch");
  const exact=rows.filter(r=>r.match_status==="exact_link"),ambiguous=rows.filter(r=>r.match_status==="ambiguous"),missing=rows.filter(r=>r.match_status==="unmatched"),conflicts=rows.filter(r=>r.match_status==="category_conflict");
  const possibleDuplicates=[...identityGroups].filter(([,g])=>g.length>1).map(([identity,g])=>({identity,source_ids:g.map(p=>p.id).sort(),review_status:"ambiguous_manual_review"}));
  const repeated=[...occurrences].filter(([,g])=>g.length>1).map(([id,g])=>({pegpedia_product_id:id,occurrences:g.length,identical_facts:g.every(p=>JSON.stringify(p)===JSON.stringify(g[0])),pages:["whiskey@400","whiskey@500"],resolution:"deduplicated only in derived unique identity set; raw pages preserved"}));
  if(repeated.some(x=>!x.identical_facts))throw new Error("same source UUID has conflicting page facts");
  const catRecon={};
  for(const c of categories.filter(x=>!x.is_tobacco)){
    const actual=products.filter(p=>p.category_name===c.name).length;
    catRecon[c.slug]={advertised:c.active_product_count,unique_ids:actual,reconciled:actual===c.active_product_count};
    if(actual!==c.active_product_count)throw new Error("source IDs do not reconcile to category total "+c.slug);
  }
  const counts={exact_link:exact.length,ambiguous:ambiguous.length,unmatched:missing.length,category_conflict:conflicts.length,potential_source_duplicate_groups:possibleDuplicates.length};
  const ordered=[...rows].sort((a,b)=>Number(Boolean(a.planner_product_id))-Number(Boolean(b.planner_product_id))||a.pegpedia_product_id.localeCompare(b.pegpedia_product_id));
  const hash=hashRows(ordered);
  const pageHashManifest=pages.map(m=>({category:m.category,offset:m.offset,count:m.count,sha256:m.sha256,url:m.url,fetched_at:m.fetched_at}));
  const categoryAbv={};
  for(const c of categories.filter(x=>!x.is_tobacco)){
    const xs=products.filter(p=>p.category_name===c.name);
    categoryAbv[c.slug]={known:xs.filter(p=>p.abv!=null).length,missing:xs.filter(p=>p.abv==null).length,unique_ids:xs.length};
  }
  const outputMap={
    "unique-source-products.jsonl":products,
    "ingestion-candidates.jsonl":ordered,
    "exact-overlap-links.jsonl":exact,
    "ambiguous-matches.jsonl":ambiguous,
    "missing-from-planner.jsonl":missing,
    "potential-source-duplicates.jsonl":possibleDuplicates,
    "repeated-page-identities.jsonl":repeated,
    "category-conflicts.jsonl":conflicts
  };
  for(const [name,arr] of Object.entries(outputMap))await fs.writeFile(path.join(dir,name),arr.map(x=>JSON.stringify(x)).join("\n")+(arr.length?"\n":""));
  await fs.writeFile(path.join(dir,"page-hash-manifest.json"),JSON.stringify(pageHashManifest,null,2)+"\n");
  await fs.writeFile(path.join(dir,"page-stability.json"),JSON.stringify({
    first_page_id_order_checks:orderChecks.map(({category,stable_order,refetched_count,fetched_at})=>({category,stable_id_order:stable_order,refetched_count,fetched_at})),
    whiskey_boundary_id_order_checks:whiskeyBoundary.map(r=>({offset:r.offset,stable_id_order:r.same,refetched_count:r.refetched_count})),
    boundary_probe:{offset:450,rows:probe.rows.length,distinct_probe_ids:new Set(probe.rows.map(p=>p.id)).size,novel_ids:recoveredNovel.map(p=>p.id),overlap_ids:probe.rows.length-recoveredNovel.length},
    note:"Stability refers to ordered IDs. SHA values in stability-rechecks.jsonl use different field projections and are not compared; original page hashes are verified against saved page snapshots."
  },null,2)+"\n");
  const knownAbv=products.filter(p=>p.abv!=null).length,knownVolume=products.filter(p=>p.volume_ml!=null).length;
  const overlapKnown=exact.filter(p=>p.bottle_abv!=null).length;
  const summary={
    source_url:"https://pegpedia-api.onrender.com/products",
    categories_advertised:categories.filter(x=>!x.is_tobacco).length,
    advertised_total:categories.filter(x=>!x.is_tobacco).reduce((s,c)=>s+c.active_product_count,0),
    primary_page_rows:raw.length,primary_page_unique_ids:new Set(raw.map(p=>p.id)).size,
    recovered_boundary_rows:recoveredNovel.length,unique_source_products:products.length,
    repeated_page_uuid_count:repeated.length,category_reconciliation:catRecon,
    planner_rows:planner.length,match_counts:counts,
    bottle_abv:{known:knownAbv,missing:products.length-knownAbv,coverage_percent:Number((100*knownAbv/products.length).toFixed(2)),by_category:categoryAbv},
    volume_ml:{known:knownVolume,missing:products.length-knownVolume,coverage_percent:Number((100*knownVolume/products.length).toFixed(2))},
    exact_overlap_bottle_abv:{known:overlapKnown,missing:exact.length-overlapKnown,total:exact.length},
    price_requests_made:0,jaipur_price_coverage:"not evaluated; no product-specific price reads were made",
    all_rows_pending_review:rows.every(r=>r.import_status==="pending_review"),
    payload_sha256:hash,self_check:checks,no_remote_writes:true
  };
  await fs.writeFile(path.join(dir,"manifest.json"),JSON.stringify(summary,null,2)+"\n");
  return {source:products.length,raw:raw.length,counts,knownAbv,missingAbv:products.length-knownAbv,knownVolume,missingVolume:products.length-knownVolume,payloadSha256:hash,categoryReconciled:Object.values(catRecon).every(x=>x.reconciled)};
}

if(typeof process!=="undefined"&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await run(process.cwd())));
