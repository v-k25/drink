# AGENTS.md

## Repository layout

- The real project is the **repository root** — a Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript marketing site ("Drink" / EkQuarter). Routes live in `app/` (a `[slug]` catch-all driven by `lib/marketing-pages.ts` plus dedicated routes like `app/early-access/`), shared components in `components/`, content/helpers in `lib/`.
- Design system: "Jaipur Editorial" — Newsreader serif + Manrope sans via next/font; tokens (`--limestone`, `--ink`, `--lac`, `--saffron`) in `app/globals.css`. Motion via the `motion` package; reduced-motion is first-class (`useReducedMotion` + CSS).
- Persistence: Supabase project **EkQuarter** (MCP pre-connected). `public.waitlist_subscribers` is insert-only from clients (RLS, no read-back); early-access writes go through a Next.js server action using server-only env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- The Phase 1 plan and checkpoint log live in **`docs/implementation-progress.md`** — read it first. Update it after every completed checkpoint.
- `.fallow/` is an external tool's cache — never touch it.

## Commands (run from repo root)

- `pnpm dev` — dev server (smoke-test UI changes here)
- `pnpm build` — production build (type-checks)
- `pnpm start` — production server (post-build smoke)
- **No lint script exists.** Verification = build + production-server smoke (+ manual dev check for UI work).

## Codebase conventions

- Reduced motion is first-class: `useReduced()` gates JS animation (scramble, count-up, custom cursor), and a `prefers-reduced-motion` CSS block nulls transitions. Preserve both paths when touching animation code.
- Custom cursor renders only on `pointer: fine` devices; interactive controls carry `aria-pressed`/`aria-expanded`/`aria-label`.
- Styling uses CSS custom properties (`--paper`, `--ink`, `--accent`, `--pour`) and `clamp()` for fluid type. Visual language: Fraunces display serif, Archivo body, paper/ink palette.

## Engineering workflow (multi-agent)

Team roles: **Sol** (architect/planner/reviewer), **Luna** (primary implementer), **Terra** (fast utility), **Kimi** (frontend/UI specialist), **DeepSeek** (backend specialist). Role prompts live in `.opencode/agents/`.

1. Sol plans, defines acceptance criteria, and writes a narrow task contract.
2. For significant frontend or backend work, Sol gets a specialist critique (Kimi / DeepSeek) before finalizing.
3. Cheapest competent executor implements: Terra for tiny/mechanical work, Luna for normal work; Kimi/DeepSeek only when implementation depends on their specialty.
4. Executor verifies (lint + build).
5. Sol reviews; findings go back to the original executor for repair. Sol does not silently rewrite.
6. Max 2 repair cycles; if the same failure repeats, Sol re-assesses architecture/spec first.

### Task contract

Every delegated task includes: objective, minimal context, allowed scope (files/dirs), do-not-change list, acceptance criteria, verification commands, and return format (files changed, summary, checks run + results, assumptions, unresolved concerns). Executors must not broaden scope.

### Escalation and cost

Cheapest competent route, in order: Terra → Luna → specialist → Sol. Escalate only when justified (task nature, repeated failure, high-risk, expensive-to-reverse). Investigate unclear bugs before delegating them.

### Scope control

Smallest change that fully solves the requirement. No unrelated rewrites, new dependencies, speculative abstractions, or redesigns during a small task. Report out-of-scope improvements separately.

### Verification is mandatory

Not done until checks were actually run: `pnpm build` at the repo root (+ production-server smoke test for UI). Never claim a check passed unless executed.

### Git safety

Commit only when asked. Never force-push, rewrite history, delete unrelated files, or touch secrets.

### Definition of done

Implemented + acceptance criteria met + verification passed + no known blockers + Sol review passed (non-trivial changes) + final response states what changed and what was verified.

### Backend note

This repo has no backend. DeepSeek involvement applies only if backend/server work is introduced.
