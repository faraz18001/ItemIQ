# Design — ItemIQ (SIUT)

A locked design system for the ItemIQ web application. Every page reads this file
before emitting code. Do not regenerate per page — extend or amend this file when
the system needs to grow.

## Genre

editorial — the calm authority of a medical reference. Clinical precision,
institutional trust, hairlines over shadows.

## Macrostructure family

Pick one base macrostructure for marketing pages and one for app pages. Pages
within a family share the family's shape; they vary only in component archetypes.

- Marketing pages: **Long Document** — Home, Features, About read as a
  considered institutional statement. Vary the section rhythm between routes.
- App pages: **Clinical Workbench** — dense, hairline-led tables; tabular
  numerals; serif page headings; restrained crimson. Function carries the page.

## Theme

Custom OKLCH palette anchored on SIUT crimson (`#c8102e`). Neutrals lean warm
toward the crimson hue (≈25°); no cool-grey SaaS neutrals, no pure black or
white. Accent occupies < 5 % of any viewport.

- `--color-paper`   oklch(0.985 0.004 25)  · light  · `--background`
- `--color-paper-2` oklch(0.965 0.006 25)  · light  · `--muted`
- `--color-ink`     oklch(0.24 0.015 25)   · light  · `--foreground`
- `--color-ink-2`   oklch(0.47 0.012 25)   · light  · `--muted-foreground`
- `--color-rule`    oklch(0.89 0.008 25)   · light  · `--border` / `--input`
- `--color-accent`  oklch(0.50 0.21 26)    · crimson · `--primary` / `--ring`
- `--color-focus`   oklch(0.58 0.20 28)

Dark mode keeps the same hue; only lightness and chroma move:

- paper oklch(0.16 0.008 25) · card oklch(0.195 0.009 25) · ink oklch(0.94 0.006 25)
- rule oklch(0.28 0.008 25) · accent lightened to oklch(0.62 0.19 27)

The colourblind-safe categorical series (`--series-1..8`) is a reserved dataviz
palette and does not participate in the design system.

## Typography

- Display: **Fraunces** (Google, variable, optical-size), weights 500–600, roman.
  Headings, marketing display, brand wordmark.
- Body/UI: **Geist** (Google), weight 400 (350 on dark). Body text and all app UI.
- Mono: **Geist Mono** (Google), weight 500. Outlier register — item IDs, stat
  numerals, section labels, kbd hints, the `SIUT · Examinations` issue row.
- Display tracking: −0.02em on headings; loose (0.12em uppercase) on mono labels.
- Type scale anchor: `--text-display` = clamp(2.5rem, 5vw + 1rem, 4.75rem);
  app page headings use `--text-2xl` serif at 600.
- Data displays use `font-variant-numeric: tabular-nums`.
- Fonts loaded from Google Fonts in `index.html` with `font-display: swap`.

## Spacing

Tailwind default scale in code; named semantic tokens declared in `tokens.css`
for the canonical rhythm: `--space-xs: 0.75rem · --space-sm: 1rem · --space-md:
1.5rem · --space-lg: 2rem · --space-xl: 3rem · --space-2xl: 4.5rem`. Sections
transition on `--space-2xl` minimum. Vary padding between sections — never pad
every section equally.

## Motion

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` (enter),
  `--ease-in: cubic-bezier(0.7, 0, 0.84, 0)` (exit),
  `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` (toggle).
- Durations: micro 120ms · short 220ms · long 420ms. Exits ~75 % of enter.
- Reveal pattern: one orchestrated entrance on marketing pages (staggered fade,
  ≤ 500 ms total). App pages: no scroll reveals.
- Reduced-motion fallback: opacity-only crossfade, ≤ 150 ms.

## Microinteractions stance

- Silent success — no celebratory toasts.
- Hover delay 800 ms · focus delay 0 ms.
- Buttons: translate-y −1px on hover, 0 on active, micro duration. No shadow-glow
  on dark surfaces. Animate only transform/opacity.
- Focus rings appear instantly (no transition on outline/ring).

## CTA voice

- Primary: crimson fill (`--primary`), ink-white text, `rounded-md`, text-sm
  font-medium, `hover:bg-brand-600`. Label is a short imperative.
- Secondary: hairline border (`--border`), card surface, `hover:bg-muted`.
- Never more than one primary CTA per viewport.

## Per-page allowances

- Marketing pages MAY use enrichment: Tier-B hand-built SVG (the ICC curve motif
  is the product's signature). Typography-led first.
- App pages MUST NOT use enrichment — function carries the page.
- Content pages: typography only.

## What pages MUST share

- The wordmark: Fraunces semibold `ItemIQ` + crimson mark + `SIUT` mono caption.
- The accent colour and its placement (< 5 % per viewport).
- The display + body + mono fonts.
- The CTA voice (button shape, radius, padding rhythm).
- Hairline rule language (`--border`) for all containment — no heavy card shadows.

## What pages MAY differ on

- Macrostructure within the page-type family (marketing pages share Long Document
  DNA; app pages share Clinical Workbench DNA).
- Section rhythm and heading placement.
- Enrichment — only on marketing pages, only Tier-B.

## Exports

### tokens.css

```css
:root {
  --color-paper:      oklch(0.985 0.004 25);
  --color-paper-2:    oklch(0.965 0.006 25);
  --color-ink:        oklch(0.24 0.015 25);
  --color-ink-2:      oklch(0.47 0.012 25);
  --color-rule:       oklch(0.89 0.008 25);
  --color-accent:     oklch(0.50 0.21 26);
  --color-focus:      oklch(0.58 0.20 28);

  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-body:    "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Geist Mono", ui-monospace, monospace;

  --space-xs: 0.75rem; --space-sm: 1rem; --space-md: 1.5rem;
  --space-lg: 2rem;    --space-xl: 3rem; --space-2xl: 4.5rem;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:  cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms; --dur-short: 220ms; --dur-long: 420ms;

  --radius-card: 0.5rem; --radius-input: 0.375rem;
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: oklch(0.985 0.004 25);   /* paper */
  --foreground: oklch(0.24 0.015 25);    /* ink */
  --primary:    oklch(0.50 0.21 26);     /* accent */
  --primary-foreground: oklch(0.985 0.004 25);
  --muted:      oklch(0.955 0.006 25);   /* rule-adjacent */
  --muted-foreground: oklch(0.47 0.012 25);
  --border:     oklch(0.89 0.008 25);    /* rule */
  --input:      oklch(0.89 0.008 25);
  --ring:       oklch(0.50 0.21 26);     /* accent */
  --radius:     0.5rem;
}
```

These live in `src/index.css` as the live tokens; this file is the source of
truth they mirror.
