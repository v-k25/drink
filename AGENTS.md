# AGENTS.md

## Repository layout

- The only real project is **`pour/`** — a Vite 8 + React 19 app (JS/JSX, no TypeScript). The root `README.md` is a stub ("EkQuarter"), not documentation.
- The entire app lives in **`pour/src/App.jsx`**: drink data (`DRINKS`), the recommendation engine (`score()`), custom hooks (`useReduced`, `useInView`, `useScramble`, `useCountUp`), all components, and the full stylesheet as an inline `` `CSS` `` template string. Keep it single-file; don't extract components or move CSS to `App.css` unless explicitly asked.
- Drink images are remote `https://picsum.photos/seed/<seed>/...` URLs keyed by each drink's `seed` field — no local image assets.
- `.fallow/` is an external tool's cache — never touch it.

## Commands (run from `pour/`)

- `npm run dev` — dev server (smoke-test UI changes here)
- `npm run build` — production build
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- **No test framework exists.** Verification = lint + build (+ manual dev-server check for UI work).

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

Not done until checks were actually run: `npm run lint` + `npm run build` in `pour/` (dev-server smoke test for UI). Never claim a check passed unless executed.

### Git safety

Commit only when asked. Never force-push, rewrite history, delete unrelated files, or touch secrets.

### Definition of done

Implemented + acceptance criteria met + verification passed + no known blockers + Sol review passed (non-trivial changes) + final response states what changed and what was verified.

### Backend note

This repo has no backend. DeepSeek involvement applies only if backend/server work is introduced.
