# React TS Template

Opinionated starting point for React + TypeScript + Vite + Tailwind v4 projects. Distilled from the shared patterns in production apps — biased toward accessibility, strict types, and a small dependency surface.

## What's inside

- **React 19 + TypeScript 5 + Vite 8** with strict `tsconfig`.
- **Tailwind CSS v4** via `@tailwindcss/vite`. Tokens live in `@theme` in `src/index.css`.
- **Semantic color tokens** (`text-foreground`, `bg-raised`, `text-accent`, etc.) with automatic dark mode via `prefers-color-scheme` — no `dark:` variants.
- **Global a11y baselines**: `prefers-reduced-motion` and `forced-colors` overrides; visible `:focus-visible` ring.
- **React Router v7** with **route-level code splitting** (`React.lazy` + shared `<Suspense>` fallback).
- **`ErrorBoundary`** with optional `resetKey` for route-reset behavior.
- **`useDocumentTitle`** hook — the only approved way to set `document.title`.
- **`fetchWithTimeout`** utility with `AbortController` + external-signal chaining.
- **`src/config/env.ts`** as the single place to read `VITE_*` variables.
- **Single `src/types/index.ts`** — no per-domain type files.
- **Verify pipeline** — `prettier-check → lint → typecheck → build`, wired into GitHub Actions.
- **GitHub Pages deploy workflow** — publishes `dist/` on every push to `main`.
- **Documented conventions** in [.github/copilot-instructions.md](.github/copilot-instructions.md).

Every one of the above is exercised at least once by the demo app, so nothing ships as dead code. The `/demo` route is the showcase — see [Removing the demo](#removing-the-demo).

## Scripts

| Script                   | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `npm run dev`            | Start the Vite dev server.                                         |
| `npm run build`          | Type-check and produce a production build.                         |
| `npm run preview`        | Preview the production build locally. **Audit this, not `dev`.**   |
| `npm run lint`           | Run ESLint.                                                        |
| `npm run typecheck`      | Run `tsc -b --noEmit`.                                             |
| `npm run format`         | Write Prettier formatting.                                         |
| `npm run prettier-check` | Verify Prettier formatting (used in CI).                           |
| `npm run verify`         | Prettier-check → lint → typecheck → build. Must pass before merge. |

## Getting started

```bash
# 1. Use this template on GitHub (or clone and re-init git)
npm install

# 2. Copy env template and fill in any VITE_* variables
cp .env.example .env.local

# 3. Start developing
npm run dev
```

## Project structure

```
src/
├── App.tsx                  # Route declarations + Suspense boundary
├── main.tsx                 # Entry: StrictMode + ErrorBoundary + BrowserRouter
├── index.css                # Tailwind @theme tokens + base styles + a11y globals
├── components/
│   ├── ErrorBoundary.tsx    # Route-aware error boundary
│   ├── RouteFallback.tsx    # <Suspense> fallback
│   └── layout/
│       └── Layout.tsx       # Header/Main/Footer shell
├── config/
│   └── env.ts               # VITE_* reader + build-time constants
├── hooks/
│   └── useDocumentTitle.ts  # Per-route <title>
├── pages/
│   ├── HomePage.tsx
│   ├── DemoPage.tsx         # Showcase — delete when you fork
│   └── NotFound.tsx
├── types/
│   └── index.ts             # All shared types
└── utils/
    └── fetchWithTimeout.ts  # fetch() + AbortController timeout
```

## Auditing performance

Run Lighthouse against `npm run preview` (port 4173), never `npm run dev`. The dev server ships unminified modules, the HMR client, and react-refresh — roughly 5 MB over 22 requests, versus ~82 kB over 6 for the real build. Auditing `dev` measures Vite's development ergonomics, not your site:

```bash
npm run build && npm run preview   # then audit http://localhost:4173/
```

## Removing the demo

The `/demo` route exists so every built-in renders at least once — the template ships no dead code. To strip it:

1. Delete `src/pages/DemoPage.tsx` and `public/demo-data.json`.
2. Remove the `DemoPage` import, its `<Route>`, the `Demo` `<NavLink>` in `Layout.tsx`, and the closing paragraph in `HomePage.tsx`.
3. Drop `DemoStatus` from `src/types/index.ts`.

Keep the route-level `<ErrorBoundary resetKey={location.pathname}>` in `App.tsx` — it is part of the shell, not the demo.

## Conventions

Full conventions are documented in [.github/copilot-instructions.md](.github/copilot-instructions.md). The highlights:

- All colors use semantic tokens. Never use raw palette classes (`text-red-600`).
- All env reads go through `src/config/env.ts`.
- Props types are local to each component file; no shared prop-type modules.
- State machines use typed string unions, not booleans.
- Run `npm run verify` before committing.

## Deploying to GitHub Pages

The template ships with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds and publishes `dist/` on every push to `main`.

1. In your repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow builds with `BASE_PATH=/<repo>/` so assets resolve correctly for a project page (e.g. `https://<user>.github.io/<repo>/`).
3. Deep links (e.g. a hard refresh on `/demo`) survive via the [rafgraph SPA redirect trick](https://github.com/rafgraph/spa-github-pages):
   - `dist/404.html` is generated at build time by the `spa-github-pages-404` plugin in [vite.config.ts](vite.config.ts), with the resolved `base` baked into it. GitHub serves it for any unknown path; it encodes the requested path into a query string and bounces to `index.html`, which IS served with a 200.
   - A small script inlined in the `<head>` of [index.html](index.html) decodes that query string before React boots. Both halves are inline, so neither costs a request.

This adapts to the base path automatically — there is nothing to hand-edit for a project page, a user page, or a custom domain.

> **Why generated, not `public/404.html`?** Vite copies `public/` verbatim and never rewrites paths inside it. A `<script src="/scripts/…">` there resolves against the domain root, so on a project page served from `/<repo>/` it 404s and the redirect silently dies.

**User/organization page** (`<user>.github.io`) or **custom domain**: override `BASE_PATH` to `/` in the workflow, or edit the default in [vite.config.ts](vite.config.ts). Nothing else changes.

**Project page** (`<user>.github.io/<repo>/`): nothing to configure — the workflow derives `BASE_PATH` from the repo name.

`BrowserRouter` uses `BASE_PATH` from [src/config/env.ts](src/config/env.ts) as its `basename`, so routing works under any base path without further changes.

## License

MIT. Replace this section when you fork the template.
