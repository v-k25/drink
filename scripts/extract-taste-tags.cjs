#!/usr/bin/env node
/*
 * extract-taste-tags.cjs
 *
 * Reads the EkQuarter drink master workbook (xlsx) and emits
 * app/find-my-drink/drinks.json: 507 products with rating, review count
 * and derived taste tags matched from a frozen curated keyword dictionary.
 *
 * Dependency-free: parses the xlsx ZIP container by hand (End of Central
 * Directory + central directory entries) and inflates entries in memory
 * with zlib. The workbook is opened read-only and never written to.
 *
 * STRENGTH GUARD: the dictionary deliberately contains no strength-implying
 * keywords ("strong", "powerful", "high-proof", "alcohol", "abv", "proof"),
 * because per the handbook a smooth taste does not establish alcohol strength.
 *
 * Usage: node scripts/extract-taste-tags.cjs [path-to-workbook.xlsx]
 */
'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ---------------------------------------------------------------------------
// Curated keyword dictionary (frozen). Case-insensitive matching over
// tasting_notes + description + botanicals; tags are the set of matched
// normalized tags.
// ---------------------------------------------------------------------------
const KEYWORDS = {
  crisp: ['crisp', 'clean', 'clean finish'],
  smooth: ['smooth', 'silky', 'rounded', 'mellow'],
  bold: ['bold', 'intense flavour', 'robust flavour'],
  light: ['light', 'easy-drinking', 'easy drinking'],
  refreshing: ['refreshing', 'fresh'],
  fruity: ['fruity', 'fruit', 'apple', 'pear', 'banana', 'berry', 'tropical', 'stone fruit'],
  citrus: ['citrus', 'lemon', 'lime', 'orange', 'zesty', 'zest', 'grapefruit'],
  sweet: ['sweet', 'sweetness', 'honeyed'],
  dry: ['dry', 'dryness'],
  spicy: ['spicy', 'spice', 'pepper', 'cinnamon', 'ginger'],
  smoky: ['smoky', 'smokiness', 'peat', 'peaty', 'peat smoke', 'char'],
  malty: ['malt', 'malty', 'grain', 'bready', 'biscuity'],
  hoppy: ['hop', 'hoppy', 'hops', 'hop bitterness'],
  floral: ['floral', 'rose', 'jasmine', 'cherry blossom', 'lavender'],
  herbal: ['herbal', 'botanical', 'botanicals', 'juniper', 'angelica', 'orris', 'coriander seed', 'herby'],
  oaky: ['oak', 'oaky', 'woody', 'wood', 'barrel'],
  vanilla: ['vanilla'],
  chocolate: ['chocolate', 'cocoa', 'cacao'],
  coffee: ['coffee', 'espresso', 'mocha'],
  caramel: ['caramel', 'toffee', 'butterscotch'],
  rich: ['rich', 'full-flavoured', 'full flavored'],
}

function matchTags(text) {
  const haystack = ` ${String(text).toLowerCase()} `
  const tags = []
  for (const [tag, keywords] of Object.entries(KEYWORDS)) {
    for (const keyword of keywords) {
      if (haystack.includes(` ${keyword} `) || haystack.includes(` ${keyword},`) || haystack.includes(` ${keyword}.`) || haystack.includes(` ${keyword};`) || haystack.includes(` ${keyword}!`) || haystack.includes(` ${keyword}?`) || haystack.includes(`(${keyword})`)) {
        tags.push(tag)
        break
      }
    }
  }
  return tags
}

// ---------------------------------------------------------------------------
// Minimal xlsx (ZIP) reader
// ---------------------------------------------------------------------------
function openZipEntries(buffer) {
  // Locate End of Central Directory record (scan backwards for signature).
  let eocdOffset = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65536); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break }
  }
  if (eocdOffset < 0) throw new Error('Not a ZIP file: no End of Central Directory record found.')
  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16)

  const entries = new Map()
  let ptr = centralOffset
  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) throw new Error('Corrupt central directory.')
    const method = buffer.readUInt16LE(ptr + 10)
    const compressedSize = buffer.readUInt32LE(ptr + 20)
    const nameLength = buffer.readUInt16LE(ptr + 28)
    const extraLength = buffer.readUInt16LE(ptr + 30)
    const commentLength = buffer.readUInt16LE(ptr + 32)
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42)
    const name = buffer.toString('utf8', ptr + 46, ptr + 46 + nameLength)
    entries.set(name, { method, compressedSize, localHeaderOffset })
    ptr += 46 + nameLength + extraLength + commentLength
  }

  return {
    read(name) {
      const entry = entries.get(name)
      if (!entry) throw new Error(`Entry not found in xlsx: ${name}`)
      const p = entry.localHeaderOffset
      if (buffer.readUInt32LE(p) !== 0x04034b50) throw new Error('Corrupt local file header.')
      const fnLen = buffer.readUInt16LE(p + 26)
      const exLen = buffer.readUInt16LE(p + 28)
      const dataStart = p + 30 + fnLen + exLen
      const raw = buffer.subarray(dataStart, dataStart + entry.compressedSize)
      if (entry.method === 0) return raw // stored
      if (entry.method === 8) return zlib.inflateRawSync(raw) // deflated
      throw new Error(`Unsupported compression method ${entry.method} for ${name}`)
    },
    has: (name) => entries.has(name),
  }
}

// ---------------------------------------------------------------------------
// Minimal XML helpers (sheet XML is generated by a spreadsheet tool, so plain
// regex tokenization is sufficient for <c>, <v>, <is><t> structures).
// ---------------------------------------------------------------------------
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
}

function columnIndex(cellRef) {
  const letters = /^[A-Z]+/.exec(cellRef)[0]
  let index = 0
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64)
  return index - 1
}

function parseSheetRows(sheetXml, sharedStrings) {
  const rows = []
  const rowRegex = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g
  let rowMatch
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowXml = rowMatch[1]
    const cells = new Map()
    const cellRegex = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
      const attrs = cellMatch[1]
      const inner = cellMatch[2] ?? ''
      const refMatch = /\br="([A-Z]+\d+)"/.exec(attrs)
      if (!refMatch) continue
      const typeMatch = /\bt="([^"]+)"/.exec(attrs)
      const type = typeMatch ? typeMatch[1] : 'n'
      let value = ''
      if (type === 'inlineStr') {
        // <is><t>...</t></is> (possibly multiple <t> runs)
        const tParts = [...inner.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => m[1])
        value = decodeEntities(tParts.join('').trim())
      } else if (type === 's') {
        const vMatch = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)
        if (vMatch) value = sharedStrings[Number(vMatch[1])] ?? ''
      } else if (type === 'str') {
        const vMatch = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)
        if (vMatch) value = decodeEntities(vMatch[1].trim())
      } else {
        const vMatch = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)
        value = vMatch ? vMatch[1].trim() : ''
      }
      cells.set(columnIndex(refMatch[1]), value)
    }
    rows.push(cells)
  }
  return rows
}

function parseSharedStrings(xml) {
  const strings = []
  const siRegex = /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g
  let match
  while ((match = siRegex.exec(xml)) !== null) {
    const parts = [...match[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => m[1])
    strings.push(decodeEntities(parts.join('')))
  }
  return strings
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const EXPECTED_ROWS = 507
const EXPECTED_HEADER = [
  'product_id', 'category', 'subcategory', 'product_name', 'brand',
  'country_of_origin', 'size_ml', 'price_inr', 'rating', 'review_count',
  'description', 'tasting_notes', 'botanicals', 'body_type',
  'product_image_url', 'country_flag_url', 'product_page_url',
  'source_category_url', 'city', 'source_file', 'original_record_id',
]

function main() {
  const repoRoot = path.resolve(__dirname, '..')
  const workbookPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(repoRoot, 'EkQuarter_Drink_Master.xlsx')

  const zip = openZipEntries(fs.readFileSync(workbookPath))

  // Resolve the first sheet's path via workbook.xml + workbook rels.
  const workbookXml = zip.read('xl/workbook.xml').toString('utf8')
  const sheetTagMatch = /<(?:\w+:)?sheet\b[^>]*>/.exec(workbookXml)
  const sheetIdMatch = sheetTagMatch && /\br:id="([^"]+)"/.exec(sheetTagMatch[0])
  let sheetPath = 'xl/worksheets/sheet1.xml'
  const relsName = 'xl/_rels/workbook.xml.rels'
  if (sheetIdMatch && zip.has(relsName)) {
    const rels = zip.read(relsName).toString('utf8')
    const relRegex = /<Relationship\b[^>]*>/g
    let relTag
    while ((relTag = relRegex.exec(rels)) !== null) {
      const tag = relTag[0]
      const idMatch = /\bId="([^"]+)"/.exec(tag)
      const targetMatch = /\bTarget="([^"]+)"/.exec(tag)
      if (idMatch && targetMatch && idMatch[1] === sheetIdMatch[1]) {
        const target = targetMatch[1].replace(/^\//, '')
        sheetPath = path.posix.normalize(target.startsWith('xl/') ? target : path.posix.join('xl', target))
        break
      }
    }
  }
  const sharedStrings = zip.has('xl/sharedStrings.xml')
    ? parseSharedStrings(zip.read('xl/sharedStrings.xml').toString('utf8'))
    : []

  const sheetXml = zip.read(sheetPath).toString('utf8')
  const rows = parseSheetRows(sheetXml, sharedStrings)
  if (rows.length < 2) throw new Error('Sheet has no data rows.')

  const header = EXPECTED_HEADER.map((col, i) => {
    const got = rows[0].get(i) ?? ''
    if (got !== col) throw new Error(`Header mismatch at column ${i + 1}: expected "${col}", got "${got}"`)
    return got
  })
  const col = Object.fromEntries(header.map((name, i) => [name, i]))

  const anomalies = []
  const drinks = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const get = (name) => (cells.get(col[name]) ?? '').trim()
    const id = get('product_id')
    const category = get('category')
    const name = get('product_name')
    const brand = get('brand')
    const sizeRaw = get('size_ml')
    const priceRaw = get('price_inr')
    const ratingRaw = get('rating')
    const reviewRaw = get('review_count')

    const missing = []
    if (!id) missing.push('product_id')
    if (!category) missing.push('category')
    if (!name) missing.push('product_name')
    if (!brand) missing.push('brand')
    if (!sizeRaw || !Number.isFinite(Number(sizeRaw))) missing.push('size_ml')
    if (!priceRaw || !Number.isFinite(Number(priceRaw))) missing.push('price_inr')
    if (!ratingRaw || !Number.isFinite(Number(ratingRaw))) missing.push('rating')
    if (missing.length > 0) {
      anomalies.push(`Row ${r + 1} (id=${id || '?'}): missing/invalid ${missing.join(', ')}`)
      continue
    }

    const reviewCount = reviewRaw === '' ? null : Number(reviewRaw)
    if (reviewCount !== null && (!Number.isInteger(reviewCount) || reviewCount < 0)) {
      anomalies.push(`Row ${r + 1} (id=${id}): odd review_count "${reviewRaw}", treated as null`)
    }

    const tagSource = [get('tasting_notes'), get('description'), get('botanicals')].filter(Boolean).join(' ')
    drinks.push({
      id,
      category,
      name,
      brand,
      sizeMl: Number(sizeRaw),
      pricePaise: Math.round(Number(priceRaw) * 100),
      rating: Number(ratingRaw),
      reviewCount: reviewCount !== null && Number.isInteger(reviewCount) && reviewCount >= 0 ? reviewCount : null,
      tags: matchTags(tagSource),
    })
  }

  if (drinks.length !== EXPECTED_ROWS) {
    console.error(`FAIL: expected ${EXPECTED_ROWS} data rows, parsed ${drinks.length}.`)
    for (const a of anomalies) console.error(`  ${a}`)
    process.exit(1)
  }

  const outDir = path.join(repoRoot, 'app', 'find-my-drink')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'drinks.json'), JSON.stringify(drinks, null, 2) + '\n')

  // ---- Verification summary ----
  const tagCounts = new Map()
  let tagged = 0
  for (const d of drinks) {
    if (d.tags.length > 0) tagged++
    for (const t of d.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
  }
  const vocab = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  console.log(`Rows parsed: ${drinks.length} (expected ${EXPECTED_ROWS})`)
  console.log(`Products with >=1 tag: ${tagged} (${((tagged / drinks.length) * 100).toFixed(1)}%)`)
  console.log(`Tag vocabulary (${vocab.length} tags), by count:`)
  for (const [tag, count] of vocab) console.log(`  ${tag}: ${count}`)
  console.log('Samples per category (up to 3):')
  const byCategory = new Map()
  for (const d of drinks) {
    if (!byCategory.has(d.category)) byCategory.set(d.category, [])
    byCategory.get(d.category).push(d)
  }
  for (const [category, list] of [...byCategory.entries()].sort()) {
    console.log(`  ${category} (${list.length}):`)
    for (const d of list.slice(0, 3)) {
      console.log(`    - ${d.name} [${d.tags.join(', ') || '(no tags)'}]`)
    }
  }
  if (anomalies.length > 0) {
    console.log('Anomalies:')
    for (const a of anomalies) console.log(`  ${a}`)
  } else {
    console.log('No anomalies; no rows skipped.')
  }
}

main()
