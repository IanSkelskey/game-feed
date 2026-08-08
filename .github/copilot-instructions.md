# Copilot Instructions

Authoritative reference for AI agents working in this repository. Read fully before editing.

---

## What this repo is

Two halves that share one type contract:

- **`collector/`** — Node scripts run by `tsx`. They call the Steam,
  RetroAchievements and SteamGridDB APIs and write `data/games.json` plus an
  append-only art library under `images/`.
- **`src/`** — a React app that reads that JSON and renders it.

`src/types/index.ts` is imported by both. It is the published contract: change
it and you have changed what every consumer of the feed receives. Never
duplicate those types into `collector/`.

`data/` and `images/` are **output**, not source. They are committed (the
collect workflow does it), and `vite.config.ts` serves them in dev and copies
them into `dist/` at build. Do not move them into `public/`.

---

## Stack

- **React 19** + **TypeScript 5** + **Vite 8**
- **React Router v7** (`BrowserRouter` + declarative `<Routes>`)
- **Tailwind CSS v4** — configured via `@theme {}` in `src/index.css`, **not** `tailwind.config.js`
- **tsx** for the collector; no build step, no emit
- No global state library, no CSS-in-JS, no `clsx` / `classnames`, no chart library, no icon library

---

## CSS Architecture

**The rule:** Tailwind handles layout and spacing. `.css` files handle only what Tailwind cannot.

### Use Tailwind for

Layout (`flex`, `grid`, `gap`), spacing (`px-6`, `py-4`, `mb-8`), typography (`text-sm`, `font-bold`), responsive breakpoints (`sm:`, `md:`), simple hover/transition (`hover:bg-accent`, `transition-colors`), and color via the semantic token palette.

### Use a co-located `.css` file for

`::placeholder` styles, `:focus` rings with `color-mix()`, `:disabled` visuals, CSS custom-property injection consumed by child rules, BEM modifier classes, `clip-rect` visually-hidden patterns, `@keyframes`, `:hover` with `transform`, `forced-colors` overrides.

Every component that needs a `.css` file owns one co-located with the same name (`Meter.tsx` → `Meter.css`).

### Semantic color tokens

Only use these color names in Tailwind classes. **Never** use raw Tailwind palette values (`red-600`, `violet-500`).

| Tailwind class                          | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `text-foreground` / `bg-foreground`     | Primary text                                       |
| `text-muted`                            | Secondary / label text (meets WCAG AA)             |
| `text-faint`                            | Decorative-only — do NOT use for readable content  |
| `text-accent` / `bg-accent`             | Brand color, links, active states                  |
| `text-accent-hover` / `bg-accent-hover` | Hover state of accent                              |
| `text-on-accent`                        | Text on `bg-accent` — **never** `text-white`       |
| `text-error` / `bg-error`               | Validation errors, destructive states              |
| `bg-surface`                            | Page background                                    |
| `bg-raised`                             | Card / input backgrounds                           |
| `border-divider`                        | Standard borders                                   |
| `border-accent`                         | Focused / active borders                           |
| `bg-series-1`, `bg-series-2`            | Chart marks — see Charts below                     |
| `bg-track`                              | The groove behind a meter or bar; never meaningful |

Alpha variants work: `bg-accent/10`, `border-error/25`.

### Dark mode

Dark mode is implemented via `@media (prefers-color-scheme: dark)` overriding the CSS custom properties that back the semantic tokens. **Never add `dark:` Tailwind variants** — tokens adapt automatically.

### Typography

`font-display` (Chakra Petch, self-hosted from `src/assets`) is for headings, stat values, and the site name. Body copy stays in the system sans. Do not add a second display face, and do not put display type at paragraph length.

### WCAG contrast

- `text-muted` meets AA on `bg-surface` and `bg-raised` in both modes.
- `text-faint` does **not** meet AA — use it only for decorative chrome that is also `aria-hidden`. Anything a reader is meant to read (including version strings and metadata) uses `text-muted`.
- Text on a colored background needs a **paired foreground token**, because dark mode re-maps the background. `bg-accent` pairs with `text-on-accent`.
- When introducing a new color, document its contrast ratio in a comment. Every ratio in `src/index.css` was measured, not estimated.

---

## Charts

There are two magnitude charts (`BarList`) and one ratio form (`Meter`). Rules:

1. **Color is validated, not chosen by eye.** `--color-series-1` and `--color-series-2` were checked for colorblind separation and ≥ 3:1 contrast against both surfaces. Adding a third series means re-validating the set, not picking a nice hue.
2. **Never encode identity in color alone.** Source (Steam vs RetroAchievements) is a label plus a decorative icon, deliberately not two colors.
3. **A stat is a number, not a one-bar chart.** Single values use `StatTile`.
4. **Charts are tables.** `BarList` renders `<table>` markup so the accessible view and the visual one are the same DOM. Keep it that way.
5. Bars stay thin, rounded on the data end only, with a 2px gap between rows. Values are direct-labeled; the hover tooltip carries the extra precision and is present in the DOM regardless of pointer.

---

## Component Patterns

```tsx
type MyComponentProps = {
  game: PlayedGame;
  variant?: "default" | "compact";
};

const MyComponent = ({ game, variant = "default" }: MyComponentProps) => {
  // ...
};

export default MyComponent;
```

- Props types are **local** to the file, defined at the top, not imported.
- Boolean variants (`featured`, `minimal`, `compact`) are props, not separate components.
- `PropsWithChildren` is acceptable for layout wrappers.

### Conditional classNames

No `clsx`. Use template literals:

```tsx
className={`meter${variant === "compact" ? " meter--compact" : ""}`}
className={({ isActive }) =>
  `font-medium ${isActive ? "text-accent" : "text-foreground hover:text-accent"}`
}
```

### CSS variable injection (per-instance values)

The only acceptable inline style. Used for anything a stylesheet cannot know:

```tsx
<div className="meter" style={{ "--meter-fill": `${pct}%` } as CSSProperties}>
```

### State

- Local state owned by the component that uses it.
- State machines use typed string unions: `"idle" | "loading" | "success" | "error"` — never booleans.
- Module-scope constants are computed once outside render, not inside.
- **Library filters live in the URL** (`useSearchParams`), not in `useState` — a filtered view should be linkable.

---

## Data flow

- The feed is fetched **once per session** by `src/utils/loadGames.ts` and shared; pages call `useLibrary()` and never fetch directly.
- `useLibrary` returns `loading | ready | empty | error`. `empty` is not an error — it is a fresh fork with no collection yet, and it renders setup instructions.
- With no collected feed, `loadGames` falls back to `public/sample-games.json` and flags `isSample`, which the layout surfaces as a banner. The collector must never write that file.
- Render image URLs through `artUrl()` (`src/utils/art.ts`), never raw. The feed's absolute URLs name the published site, which does not exist on a fresh fork.
- Achievements have **three** states, read via `achievementSupportOf()` — never `totalCount > 0` inline. A game with none gets a plain note, not a 0% meter: an empty bar accuses the player of not having earned something that was never on offer. `unknown` (the lookup failed) is stated as such and never rendered as `none`.
- Read the feed URL from `src/config/env.ts` (`DATA_URL`), never `import.meta.env` directly.
- New fetches use `fetchWithTimeout`, handle `!res.ok`, and handle network rejection.

---

## Icons

`src/components/Icon.tsx` is the single choke point — hand-written 24×24 paths, every one rendered `aria-hidden` + `focusable={false}`. Add a path to the `PATHS` map rather than importing an icon library or inlining an `<svg>` in a component. Accessible labels come from surrounding text or an `aria-label` on the parent.

---

## Configuration

`site.config.ts` at the repo root holds everything a fork is expected to change. Both halves import it.

- **`collect.*` decides what enters the feed; `display.*` decides what this site renders from it.** Do not conflate them. Hiding something in `display` must leave the feed untouched, and a `collect` option must remove the field rather than zero it — `playtimeMinutes: 0` is a claim the game was never played.
- Components read settings from `src/config/env.ts`, never from `site.config.ts` directly. The collector reads them from `collector/config.ts`. Those two files are the only ones that know where settings come from.
- A `display` option must remove **every** surface of the thing, not just the obvious one — including any sort order or filter keyed on it, and any layout that assumed its presence (column counts, chart pairings). A control that reorders by a hidden value is a bug.
- Add the field to `SiteConfig` in `src/types/index.ts` first, so a typo fails `npm run typecheck`.

## Types

All shared types live in `src/types/index.ts` — no per-domain type files. Feed types come first, settings next, front-end view models after the divider.

---

## Routing

Routes declared in `src/App.tsx`. Lazy-load non-critical pages with `React.lazy` + `<Suspense fallback={<RouteFallback />}>`. Keep the home route eager.

Call `useDocumentTitle(title?)` in every page. Never mutate `document.title` directly.

---

## The collector

- Runs under `tsx`, type-checked by `tsconfig.collector.json`. `erasableSyntaxOnly` is on: no constructor parameter properties, no enums, no namespaces.
- A source that throws is reported and skipped so the other still publishes; a run that collects nothing exits non-zero **without writing**, so an outage can never blank a live site.
- The art library is append-only: never re-download a file that exists, never overwrite one. Published URLs are permanent.
- `SITE_BASE` is derived (env → `GITHUB_REPOSITORY` → git origin). Do not hardcode a URL.

---

## Accessibility

1. **Icon-only interactive elements** must have `aria-label`.
2. **Decorative icons** are rendered with `aria-hidden` and `focusable={false}`.
3. **Toggle buttons** use `aria-pressed`; disclosure buttons use `aria-expanded`.
4. **`<nav>` landmarks** have `aria-label` when more than one exists on a page.
5. **Dynamic content** uses `aria-live="polite"` (loading / counters) or `role="alert"` (errors).
6. **Form fields**: every field has an `id`, a `<label htmlFor>`, and `aria-describedby` pointing to any error element. Use `useId()` for stable IDs.
7. **Decorative links** (thumbnail wrappers that duplicate a heading link) use `tabIndex={-1}` + `aria-hidden` — see `GameCard`.
8. **Cover art is `alt=""`** — the heading beside it names the game, and repeating it makes screen readers say the title twice.
9. Use semantic HTML: `<header>`, `<footer>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<dl>` for stats.
10. `prefers-reduced-motion` and `forced-colors` overrides exist in `src/index.css` — do not override them. Components whose meaning is carried by fill color (meters, bars) ship their own `forced-colors` rules.

---

## Code Style & Philosophy

- **No unnecessary dependencies.** Check if the platform or an existing utility solves it first.
- **Typed precisely.** Discriminated unions where they add real value.
- **Explicit over implicit.** Comments explain _why_, not _what_.
- **The `verify` script** (`npm run verify`) chains prettier-check → lint → typecheck → build. All must pass before committing.
- **No inline styles except CSS variable injection.**

---

## Quality Gates (before claiming a task complete)

1. `npm run verify` exits 0.
2. Any new component renders at least once in the app.
3. Any new color either goes through a semantic token or carries an inline comment stating its measured contrast ratio.
4. New interactive elements are keyboard-operable, have a visible focus style, and meet the accessibility checklist.
5. New fetches use `fetchWithTimeout`, handle `!res.ok`, and handle network rejection.
6. Changes to `src/types/index.ts` are treated as breaking changes to the published feed.

---

## Common mistakes to avoid

- Adding raw Tailwind colors (`text-red-600`, `bg-violet-500`). Use semantic tokens.
- Pairing `bg-accent` with `text-white`. Use `text-on-accent`.
- Adding `dark:` variants. Dark mode is handled by `prefers-color-scheme`.
- Treating `text-faint` as body text — it's decorative.
- Fetching the feed from a component instead of `useLibrary()`.
- Duplicating feed types into `collector/`.
- Moving `data/` or `images/` into `public/`.
- Creating new pages without calling `useDocumentTitle`.
- Submitting without running `npm run verify`.
