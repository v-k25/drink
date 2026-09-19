# AllCheers

This repository contains the AllCheers Phase 1 marketing website, built with Next.js 16 App Router. The homepage explains the upcoming Find My Drink and Party Planner journeys, Jaipur launch and early access. The functional product remains a later phase.

Approved visual references are `output/allcheers-v2-party/home-desktop.png` and `output/allcheers-v2-party/home-mobile-refined.png`. Marketing scope is in `docs/allcheers-brief.md`. Reusable photo candidates are listed in `output/photo-shortlist/index.html`; `output/photo-shortlist/pinterest-references/index.html` is Pinterest research only and has no reuse clearance.

## Setup

Install dependencies with `pnpm install`, then start the development server with `pnpm dev`. Open `http://localhost:3000`.

Run `pnpm build` for a production build, `pnpm start` to serve it, and `node node_modules/typescript/bin/tsc --noEmit` for the standalone TypeScript check.

## Backend preservation

The early-access form reuses the unchanged `app/early-access/actions.ts` server action, including validation, explicit consent and insert-only Supabase persistence. Credentials stay in environment files and are not committed. Tests use mocked responses rather than live subscriber inserts.

Production asset provenance and the generated hero prompt are in `docs/allcheers-assets.md`. Implementation and verification evidence are tracked in `docs/implementation-progress.md`. Search indexing remains disabled pending launch.
