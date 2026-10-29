// Current setup, suggestion and browse flow production regression.
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const result = spawnSync(process.execPath, [path.join(__dirname, 'planner-ux-production-check.cjs')], { stdio: 'inherit', env: process.env })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
