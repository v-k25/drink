# AGENTS.md

## Repository layout

This is a Next.js 16 App Router + React 19 + Tailwind 4 + TypeScript project. The current public surface is the neutral placeholder in `app/`; the preserved backend action is `app/early-access/actions.ts`.

Read `docs/implementation-progress.md` first and update it after every completed checkpoint.

Persistence uses the existing EkQuarter Supabase project. Preserve the server action’s validation, consent, insert-only behavior, credentials, and environment files. New backend work is outside the current reset scope.

`.fallow/`, `.opencode/`, `docs/agent-workflow.md`, recovery archives, product spreadsheets/images, and mockup output are preserved source-adjacent material. Do not touch them unless explicitly requested.

## Commands and verification

- `pnpm dev` — development server
- `pnpm build` — production build
- `pnpm start` — production server
- `node node_modules/typescript/bin/tsc --noEmit` — standalone TypeScript check
- `git diff --check` — whitespace check

No lint script exists. Do not change package or lockfiles to hide dependency drift. If pnpm is unavailable, use Corepack with `pnpm_config_verify_deps_before_run=warn`.

## Backend note

The existing early-access server action and Supabase persistence are backend surfaces. Preserve their validation, consent and insert-only behavior. New product backend work is outside the current marketing-site phase.

## Engineering workflow (multi-agent)

Use only native ChatGPT/Codex agents for this project: **Astra** (director, architect and final reviewer), **Luna** (normal implementation), **Terra** (small mechanical work), **Sol** (optional bounded analysis/review). Do not invoke OpenCode or external-provider agents, including Kimi/DeepSeek. `.opencode/` is legacy configuration, not the active workflow. See `docs/agent-workflow.md`.

1. Astra inspects the problem, freezes scope/interfaces and writes acceptance criteria.
2. Default to one executor. Get a separate critique only for a concrete unresolved design, security or architecture risk.
3. In native Codex explicitly select `gpt-5.6-luna` for normal implementation or `gpt-5.6-terra` for mechanical work, with `fork_turns: none` and a self-contained narrow contract. Astra uses `gpt-6-astra`; optional Sol uses `gpt-5.6-sol`. Never silently inherit Astra for routine execution.
4. Parallelize disjoint files only, normally at most two workers. Workers run focused checks; one designated worker runs the integrated build. Never race builds in the shared checkout.
5. Astra reviews the diff and verification evidence. Findings return to the same executor; Astra does not silently rewrite their implementation.
6. Max two repair cycles; repeated failure triggers scope/architecture reassessment. No recursive delegation unless the contract explicitly permits it.

### Task contract

Every delegated task includes: objective, minimal context, allowed scope (files/dirs), do-not-change list, acceptance criteria, verification commands, and return format (files changed, summary, checks run + results, assumptions, unresolved concerns). Executors must not broaden scope.

### Escalation and cost

Choose the smallest competent model directly; do not run every role as an automatic chain. Keep handoffs concise, send file paths and relevant excerpts instead of brainstorming history, and reuse workers for repairs. Escalate to Astra for unresolved architecture. Report actual token usage only when available; never promise measured savings without measurements.

### Scope control

Smallest change that fully solves the requirement. No unrelated rewrites, new dependencies, speculative abstractions, or redesigns during a small task. Report out-of-scope improvements separately.

### Verification is mandatory

Not done until checks were actually run: `pnpm build` and `node node_modules/typescript/bin/tsc --noEmit` at the repo root (+ production-server smoke test for UI). Current Next config skips build-time type validation, so the separate TypeScript check is required. If pnpm is absent from PATH, use Corepack. The local pnpm 11 installation currently warns about dependency/lockfile drift and ignored package.json overrides; do not silently reinstall or change dependencies to hide this. Never claim a check passed unless executed.

### Git safety

Commit only when asked. Never force-push, rewrite history, delete unrelated files, or touch secrets.

### Definition of done

Implemented + acceptance criteria met + verification passed + no known blockers + Astra review passed (non-trivial changes) + final response states what changed and what was verified.

## Scope and design

The current page is intentionally neutral: white background, system fonts, no forms, animation, analytics, old fonts, creative assets, sitemap, or inherited brand requirements. Future cream/berry/plum, rounded sans-serif, Jaipur, and togetherness ideas are exploratory only; do not implement them until requested and approved.

## Graphify

Graphify is installed locally. For broad exploration use `graphify query "question" --budget 1200` or `graphify affected "symbol" --depth 2`, and verify results against source. Refresh after a completed checkpoint with `graphify extract . --code-only --no-cluster --max-workers 2`. The ignored `graphify-out/` directory is navigation aid only.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
