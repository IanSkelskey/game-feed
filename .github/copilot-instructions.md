# Copilot Instructions

Authoritative reference for AI agents working in this template. Read fully before editing.

---

## Stack

- **React 19** + **TypeScript 5** + **Vite 8**
- **React Router v7** (`BrowserRouter` + declarative `<Routes>`)
- **Tailwind CSS v4** — configured via `@theme {}` in `src/index.css`, **not** `tailwind.config.js`
- No global state library, no CSS-in-JS, no `clsx` / `classnames`, no animation library, no icon library pre-installed

---

## CSS Architecture

**The rule:** Tailwind handles layout and spacing. `.css` files handle only what Tailwind cannot.

### Use Tailwind for

Layout (`flex`, `grid`, `gap`), spacing (`px-6`, `py-4`, `mb-8`), typography (`text-sm`, `font-bold`), responsive breakpoints (`sm:`, `md:`), simple hover/transition (`hover:bg-accent`, `transition-colors`), and color via the semantic token palette.

### Use a co-located `.css` file for

`::placeholder` styles, `:focus` rings with `color-mix()`, `:disabled` visuals, CSS custom-property injection consumed by child rules, BEM modifier classes, `clip-rect` visually-hidden patterns, `@keyframes`, `:hover` with `transform`.

Every component that needs a `.css` file owns one co-located with the same name (`ErrorBoundary.tsx` → `ErrorBoundary.css`).

### Semantic color tokens

Only use these color names in Tailwind classes. **Never** use raw Tailwind palette values (`red-600`, `blue-500`).

| Tailwind class                          | Purpose                                           |
| --------------------------------------- | ------------------------------------------------- |
| `text-foreground` / `bg-foreground`     | Primary text                                      |
| `text-muted`                            | Secondary / label text (meets WCAG AA)            |
| `text-faint`                            | Decorative-only — do NOT use for readable content |
| `text-accent` / `bg-accent`             | Brand color                                       |
| `text-accent-hover` / `bg-accent-hover` | Hover state of accent                             |
| `text-on-accent`                        | Text on `bg-accent` — **never** `text-white`      |
| `text-error` / `bg-error`               | Validation errors, destructive states             |
| `bg-surface`                            | Page background                                   |
| `bg-raised`                             | Card / input backgrounds                          |
| `border-divider`                        | Standard borders                                  |
| `border-accent`                         | Focused / active borders                          |

Alpha variants work: `bg-accent/10`, `border-error/25`.

### Dark mode

Dark mode is implemented via `@media (prefers-color-scheme: dark)` overriding the CSS custom properties that back the semantic tokens. **Never add `dark:` Tailwind variants** — tokens adapt automatically.

### WCAG contrast

- `text-muted` meets AA on `bg-surface` and `bg-raised` in both modes.
- `text-faint` does **not** meet AA — use it only for decorative chrome that is also `aria-hidden`. Anything a reader is meant to read (including version strings and metadata) uses `text-muted`.
- Text on a colored background needs a **paired foreground token**, because dark mode re-maps the background. `bg-accent` pairs with `text-on-accent`; a hardcoded `text-white` fails AA in dark mode at 2.5:1. Introduce the same pairing for any new surface color.
- When introducing a new color, document its contrast ratio in a comment.

---

## Component Patterns

```tsx
type MyComponentProps = {
  item: Item;
  variant?: "default" | "compact";
};

const MyComponent = ({ item, variant = "default" }: MyComponentProps) => {
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
className={`contact-form-input${error ? " contact-form-input--invalid" : ""}`}
className={`filter-btn ${isActive ? "active" : ""}`}
className={({ isActive }) =>
  `font-medium ${isActive ? "text-accent" : "text-foreground hover:text-accent"}`
}
```

### CSS variable injection (per-instance theming)

```tsx
<article
  className="project-card"
  style={{ "--project-accent": color } as React.CSSProperties}
>
```

### State

- Local state owned by the component that uses it.
- State machines use typed string unions: `"idle" | "submitting" | "success" | "error"` — never booleans.
- Module-scope constants are computed once outside render, not inside.

---

## Icons

No icon library is included by default. When you need icons, choose one and apply a **single choke point**:

1. Install the library (e.g. `react-icons`, `lucide-react`, inline SVGs).
2. Create `src/components/Icon.tsx` that wraps the library and renders every icon with `aria-hidden` + `focusable={false}`.
3. Import from that file only — never from the underlying library — so tree-shaking and accessibility defaults stay centralized.
4. Accessible labels come from surrounding text or an `aria-label` on the parent (e.g. icon-only buttons).

---

## Types

All shared types live in `src/types/index.ts` — no per-domain type files.

---

## Routing

Routes declared in `src/App.tsx`. Lazy-load non-critical pages with `React.lazy` + `<Suspense fallback={<RouteFallback />}>`. Keep home/landing eager.

Call `useDocumentTitle(title?)` in every page. Never mutate `document.title` directly.

---

## Accessibility

1. **Icon-only interactive elements** must have `aria-label`.
2. **Decorative icons** are rendered with `aria-hidden` and `focusable={false}`.
3. **Toggle buttons** use `aria-pressed`; disclosure buttons use `aria-expanded`.
4. **`<nav>` landmarks** have `aria-label` when more than one exists on a page.
5. **Dynamic content** uses `aria-live="polite"` (loading / counters) or `role="alert"` (errors / success).
6. **Form fields**: every field has an `id`, a `<label htmlFor>`, `aria-invalid={!!error}`, and `aria-describedby` pointing to the error element's `id`. Use `useId()` for stable IDs.
7. **Error elements** use `role="alert"`.
8. **Decorative links** (e.g. thumbnail wrappers that duplicate a heading link) use `tabIndex={-1}` + `aria-hidden`.
9. Use semantic HTML: `<header>`, `<footer>`, `<nav>`, `<main>`, `<article>`, `<section>`.
10. `prefers-reduced-motion` and `forced-colors` overrides exist in `src/index.css` — do not override them.

---

## Fetch / API

- Use `fetchWithTimeout` from `src/utils/fetchWithTimeout.ts`.
- Every fetch must handle `!res.ok`, handle network rejection, and must not block first render.
- Read `API_URL` from `src/config/env.ts`, not `import.meta.env` directly.

---

## Code Style & Philosophy

- **No unnecessary dependencies.** Check if the platform or an existing utility solves it first.
- **Typed precisely.** Discriminated unions where they add real value.
- **Explicit over implicit.** Comments explain _why_, not _what_. Document WCAG contrast when introducing a color.
- **The `verify` script** (`npm run verify`) chains prettier-check → lint → typecheck → build. All must pass before committing.
- **No inline styles except CSS variable injection.** Dynamic `--css-var` injection via `style={}` is acceptable; hardcoded color/size values are not.

---

## Quality Gates (before claiming a task complete)

1. `npm run verify` exits 0.
2. Any new component renders at least once in the app.
3. Any new color literal either (a) goes through a semantic token, or (b) carries an inline comment stating its WCAG contrast ratio.
4. New interactive elements are keyboard-operable, have a visible focus style, and meet the accessibility checklist.
5. New `fetch` calls use `fetchWithTimeout`, handle `!res.ok`, and handle network rejection.

---

## Common mistakes to avoid

- Adding raw Tailwind colors (`text-red-600`, `bg-blue-100`). Use semantic tokens.
- Pairing `bg-accent` with `text-white`. Use `text-on-accent` — white fails AA in dark mode.
- Adding `dark:` variants. Dark mode is handled by `prefers-color-scheme`.
- Treating `text-faint` as body text — it's decorative.
- Creating new pages without calling `useDocumentTitle`.
- Reading `import.meta.env.*` outside `src/config/env.ts`.
- Submitting without running `npm run verify`.
