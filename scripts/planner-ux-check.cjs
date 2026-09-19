// The former category-singleton/swap UX assertions are superseded by the stronger
// inventory production regression: sibling retention, per-product quantities,
// compact headings/entry focus, responsive layouts, keyboard and mobile dialog flow.
// Keep this entry point for existing verification commands; no old singleton claims.
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const result = spawnSync(process.execPath, [path.join(__dirname, 'planner-inventory-check.cjs')], { stdio: 'inherit', env: process.env })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
