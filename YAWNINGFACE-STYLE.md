# YawningFace — Real Design System

Reverse-engineered from YawningFace's own public web repos (cloned to
`_vowen_analysis/yf-study/`). This is the **actual** brand: **light / warm near-white
by default, amber accent, friendly rounded shapes**. It is NOT a dark amber theme.

Repos studied:
- `tools/` — Next.js 16 + Tailwind v4 + shadcn (style `base-nova`) — **the richest, most authoritative reference** (tools.yawningface.org).
- `yawningface_landing/` — Vite + React 18 + Tailwind v3 — the main yawningface.org landing. Its config comment says tokens were *"derived from the tools repo."*
- `browser-start-page/` — Chrome-extension monorepo. Its `tailwind-config` carries an **explicit named-hex** version of the whole palette incl. dark theme + a full amber ramp. Best source for exact dark hex values.
- `block_chromium/` — same extension boilerplate family; no additional brand facts.

---

## 1. Light is the default. Dark is latent, not active.

- **Light is unequivocally the default.** Every repo paints a warm near-white canvas
  out of the box.
  - `tools/src/app/globals.css` `:root` = the light theme (no `.dark` on `<html>`).
  - `yawningface_landing/index.html` hard-codes `html,body { background:#fefdfb; color:#2a2720 }` inline.
  - `browser-start-page` new-tab/options `index.css` → `background-color:#fefdfb`.
- **Dark mode exists as infrastructure but is not wired up in the sites:**
  - `tools` has `next-themes` installed and a `.dark { … }` block in `globals.css`, and shadcn UI components carry `dark:` variants. BUT there is **no `ThemeProvider`, no theme toggle, and no `useTheme`/`setTheme` call** anywhere in `src/app` or `src/components/layout`. The only `useTheme` is inside `ui/sonner.tsx` (toast theming), defaulting to `"system"`. So the shipped site is effectively **light-only**; dark is dormant.
  - `yawningface_landing` (Tailwind v3 config) has **no dark variants at all** — comment: *"No dark variants."*
  - `browser-start-page` config uses `darkMode: 'class'` and defines full dark hex tokens (`bg-dark`, `ink-on-dark`, etc.), so when YawningFace *does* go dark, it's a **warm dark** (`#1B1814`), never pitch black.
- **Dark mode strategy (when used):** Tailwind **class strategy** — `.dark` class on an ancestor. In `tools` (Tailwind v4) it's `@custom-variant dark (&:is(.dark *))`; in `browser-start-page` (v3) it's `darkMode: 'class'`.

> Rule: ship **light by default**. If you add dark, use a `.dark` class toggle and the warm dark values below — never `#000`.

---

## 2. Color palette (exact values)

The canonical light tokens. The `tools` repo defines them in **OKLCH**; the
`yawningface_landing` and `browser-start-page` repos restate the *same* design in
**hex**. Use the hex column — it's what YawningFace themselves wrote for the hex-based projects.

### Light theme (DEFAULT)

| Token | Hex | OKLCH (tools) | Source |
|---|---|---|---|
| background (warm near-white canvas) | `#FEFDFB` | `oklch(0.995 0.004 85)` | landing config; globals.css `:root` |
| foreground (warm near-black ink) | `#2A2720` | `oklch(0.2 0.012 60)` | landing config; globals.css |
| card | `#FFFFFF` (pure white) | `oklch(1 0 0)` | landing config; globals.css |
| popover | `#FFFFFF` | `oklch(1 0 0)` | landing config; globals.css |
| **primary (amber)** | **`#EBB303`** | `oklch(0.82 0.17 88)` | landing config; globals.css; bsp `brand.DEFAULT` |
| **primary-foreground (text ON amber)** | **`#2A2720`** (dark ink, NOT white) | `oklch(0.2 0.012 60)` | landing config; globals.css |
| secondary (warm off-white surface) | `#F8F6F1` | `oklch(0.97 0.006 85)` | landing config |
| secondary-foreground | `#2A2720` | `oklch(0.2 0.012 60)` | landing config |
| muted (surface) | `#F8F6F1` | `oklch(0.97 0.006 85)` | landing config |
| muted-foreground (secondary text) | `#736D5E` | `oklch(0.5 0.012 65)` | landing config |
| accent | `#F5F2EA` | `oklch(0.96 0.015 85)` | landing config |
| accent-foreground | `#2A2720` | `oklch(0.2 0.012 60)` | landing config |
| border | `#EBE8DF` (warm) | `oklch(0.92 0.008 80)` | landing config |
| input | `#EBE8DF` | `oklch(0.92 0.008 80)` | landing config |
| ring (focus) | `#EBB303` (amber) | `oklch(0.82 0.17 88)` | landing config |
| destructive | `#DC2626` (text) | `oklch(0.58 0.22 27)` | landing config / globals.css |

Note: `browser-start-page` gives subtly warmer neutrals for the same roles
(`bg.soft #FAF7F0`, `bg.muted #F3EEE2`, `ink.soft #4A4539`, `ink.muted #736D5E`,
`ink.faint #A59C87`, `line #EBE4D2`, `line.strong #D9CFB4`). Treat these as the
extended warm-neutral ramp if you need more steps. (`browser-start-page/packages/tailwind-config/tailwind.config.ts`)

### The amber primary — full ramp (`browser-start-page` `brand`)

```
50  #FFFBEB   100 #FEF3C7   200 #FDE68A   300 #FCD34D   400 #F4C017
500 #EBB303 (DEFAULT)   600 #D4A20F   700 #A8800B   800 #7A5D08   900 #4D3B05
```
The brand amber is **`#EBB303`** (= `brand.500` / `brand.DEFAULT`). Confirmed.
A near-equivalent Tailwind `amber-500` is used for the GitHub-star icon fill
(`text-amber-500`, `tools/site-header.tsx`).

### Dark theme (warm, when enabled)

Hex from `browser-start-page`; OKLCH from `tools/globals.css` `.dark`:

| Token | Hex (bsp) | OKLCH (tools) |
|---|---|---|
| background | `#1B1814` | `oklch(0.15 0.01 60)` |
| background-soft | `#22201B` | — |
| card | `#2A2720` | `oklch(0.2 0.012 60)` |
| muted surface | `#37342C` | `oklch(0.26 0.012 60)` |
| foreground (on dark) | `#F5F1E4` | `oklch(0.98 0.005 85)` |
| foreground-soft | `#D9D3C1` | — |
| muted-foreground | `#A59C87` | `oklch(0.7 0.012 65)` |
| border | `#3B372E` | `oklch(1 0 0 / 10%)` |
| primary (amber, **shared across modes**) | `#EBB303` | `oklch(0.82 0.17 88)` |
| primary-foreground (on dark) | dark ink `#1B1814`-ish | `oklch(0.15 0.01 60)` |

Dark mode keeps the **same amber primary**, and a **warm dark** base (`#1B1814`),
never pure black. Comment in bsp config: *"Dark palette stays warm rather than pitch-black."*

---

## 3. Typography

- **Body / sans:** **Inter** (variable). `tools` loads it via `next/font/google` as `--font-sans`; landing & bsp self-host via `@fontsource-variable/inter` (*"no Google Fonts CDN, no tracking"* — `landing/src/main.jsx`).
- **Headings:** **Bricolage Grotesque** (variable) as `--font-heading`. Used for all `h1–h6` and card/section titles via `font-heading`.
- **Mono:** **JetBrains Mono** as `--font-mono` (only in `tools`, for the code-to-image tool). (`tools/layout.tsx`)
- **Heading treatment (consistent everywhere):**
  ```css
  h1..h6 { font-family: var(--font-heading), var(--font-sans); letter-spacing: -0.02em; }
  ```
  (`tools/globals.css`, `landing/index.css`)
- **Weights:** headings are **`font-medium` (500)**, not bold. Body is normal. Nav/logo use `font-semibold`. YawningFace deliberately avoids heavy/black weights.
- **Heading sizes (the hero scale, identical in tools & landing):**
  - Hero `h1`: `text-5xl md:text-6xl lg:text-7xl`, `font-medium`, `leading-[1.05]`, `tracking-tight`.
  - Section `h2`: `text-3xl md:text-4xl font-medium tracking-tight`.
  - Card `h3`: `text-xl font-medium tracking-tight`.
  - Tool page `h1`: `text-4xl md:text-5xl font-medium tracking-tight` (`tool-hero.tsx`).
- Body copy: `text-lg leading-relaxed text-muted-foreground` for hero subtext; `text-sm leading-relaxed text-muted-foreground` in cards.

---

## 4. Border radius & spacing

- **Base radius is large and friendly: `--radius: 1rem`** (`tools/globals.css`, comment: *"Rounded, toy-like, welcoming."*).
- Tools radius scale (Tailwind v4, derived from `--radius`):
  `sm 0.6rem · md 0.8rem · lg 1rem · xl 1.4rem · 2xl 1.8rem · 3xl 2.2rem · 4xl 2.6rem`.
- Landing v3 restates the same: `sm .6 / md .8 / lg 1 / xl 1.4 / 2xl 1.8 / 3xl 2.2 rem`.
- Practical usage:
  - **Cards:** `rounded-2xl` (~1.8rem).
  - **Icon tiles inside cards:** `rounded-xl` (~1.4rem).
  - **Buttons:** `rounded-lg` (1rem).
  - **Pills / badges / GitHub button:** `rounded-full` (badge primitive uses `rounded-4xl`).
  - **Tool hero icon badge:** `rounded-2xl`.
- **Container width:** **`max-w-6xl` (72rem)** centered with `mx-auto px-6` — used by header, footer, hero, and every page section. This is the single most repeated layout token.
- **Section rhythm:** page wrapper `py-16 md:py-24`; stacked sections `space-y-20`; section header→grid gap `mt-8`; card grids `gap-5`.
- **Shadows (soft, warm-tinted — from bsp config):**
  ```
  soft: 0 1px 2px rgba(42,39,32,.04), 0 4px 12px rgba(42,39,32,.06)
  card: 0 1px 2px rgba(42,39,32,.04), 0 8px 24px rgba(42,39,32,.08)
  ```
  Shadows are subtle; the brand leans on **rings/borders + tiny hover lift**, not heavy drop shadows. Note shadow color is the warm ink `#2A2720`, not black.

---

## 5. Buttons (avoid the "black-on-dark" contrast bug)

From `tools/src/components/ui/button.tsx` (shadcn / `@base-ui/react`, `cva` variants).
Base: `inline-flex items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-all` + amber focus ring (`focus-visible:ring-3 focus-visible:ring-ring/50`, ring = amber).

| Variant | Classes | Effective colors |
|---|---|---|
| **default (primary)** | `bg-primary text-primary-foreground [a]:hover:bg-primary/80` | **amber `#EBB303` bg, dark ink `#2A2720` text** |
| **outline** | `border-border bg-background hover:bg-muted hover:text-foreground` | warm-white bg, warm border, ink text |
| **secondary** | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | `#F8F6F1` bg, ink text |
| **ghost** | `hover:bg-muted hover:text-foreground` | transparent → muted on hover |
| **destructive** | `bg-destructive/10 text-destructive hover:bg-destructive/20` | soft red tint, red text (NOT solid red) |
| **link** | `text-primary underline-offset-4 hover:underline` | amber text link |

**THE critical rule:** the amber primary button uses **dark ink text (`primary-foreground = #2A2720`), never white.** Amber `#EBB303` is bright/light — white text on it fails contrast. Pair amber with dark ink. Hover = `bg-primary/80` (slightly darker amber), not a color swap.

- Sizes: `default h-8 px-2.5`, `sm h-7`, `lg h-9`, `xs h-6`, plus icon sizes `size-6/7/8/9`. Active state nudges down 1px (`active:translate-y-px`).
- The most visible CTA in the live sites is the **"Star on GitHub" pill**, NOT a primary button:
  `inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md`, with an amber-filled star icon (`text-amber-500`). (`tools/site-header.tsx`, `site-footer.tsx`)

---

## 6. Cards, sections, nav, hero patterns

### Card (the signature component)
Marketing/tool cards (`tools/page.tsx` `ToolCard`, `landing/Products.jsx` `ProductCard` — byte-for-byte the same pattern):
```
group relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6
transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm
```
- White card on warm bg, warm border, **hover = lift 0.5 + amber-tinted border (`border-primary/40`) + soft shadow.**
- Each card opens with an **icon tile**: `flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary` → amber icon on a 10%-amber wash; hover deepens to `bg-primary/20`. This amber-wash icon tile is a brand signature (also `tool-hero.tsx` at `h-14 w-14 rounded-2xl bg-primary/10 text-primary`).
- Title `font-heading text-xl font-medium`, desc `text-sm leading-relaxed text-muted-foreground`.
- "Coming soon"/status uses a muted pill: `rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground` (live status uses `bg-primary/15`).
- The shadcn `ui/card.tsx` primitive differs slightly: `rounded-xl bg-card ring-1 ring-foreground/10` (uses a hairline ring instead of border), `font-heading` title, footer `bg-muted/50 border-t`.

### Nav / header (identical in tools & landing)
```
sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md
  > div: mx-auto flex h-16 max-w-6xl items-center justify-between px-6
```
- **Logo = the 🥱 yawning-face emoji** at `text-2xl` that rotates on hover (`group-hover:rotate-12`), next to wordmark **"YawningFace"** in `text-lg font-semibold tracking-tight`. The tools site appends `· tools` in `text-muted-foreground`.
- Nav links: `text-sm text-muted-foreground hover:text-foreground`, `gap-6`, hidden below `md`.
- Right side: the GitHub-star pill (above).

### Hero
- `flex flex-col items-start gap-6`, left-aligned, inside the `max-w-6xl px-6 py-16 md:py-24` wrapper.
- Giant `font-medium` heading where one phrase is wrapped in **`<span className="text-primary">`** (amber) for emphasis — e.g. *"just work"*, *"screen time"*. This amber-highlighted phrase in an otherwise-ink headline is THE hero signature.
- Subhead `max-w-xl/2xl text-lg leading-relaxed text-muted-foreground`.
- Tools hero adds trust badges: `rounded-full border border-border bg-card px-3 py-1 text-xs font-medium` ("No signup", "No tracking cookies", "Runs in your browser", "Open source").

### Footer (`tools/site-footer.tsx`)
`mt-24 border-t border-border/60 bg-secondary/40`, `max-w-6xl px-6 py-12 md:py-16`, 3-col grid. Repeats the emoji logo + GitHub pill; a creator card (round avatar `rounded-full`, "Xuban Ceccon, Creator & Maintainer"); a LinkedIn "Let's chat" link in LinkedIn blue `#0A66C2`; copyright "© {year} YawningFace · An independent project."

---

## 7. Logo usage

- The brand mark is the **🥱 (yawning face) emoji**, not an SVG logo, rendered at `text-2xl` beside the **"YawningFace"** wordmark (`text-lg font-semibold tracking-tight`).
- Playful micro-interaction: emoji rotates 12° on hover (`group-hover:rotate-12 transition-transform`).
- Context suffix in muted color when scoping a sub-site: `YawningFace` + `<span className="text-muted-foreground"> · tools</span>`.
- Favicon: `public/favicon.ico` (landing). No separate image logo asset is used in the nav.

---

## 8. Components / libraries

- **tools (flagship):** Next.js 16 (App Router, RSC) · React 19 · **Tailwind v4** · **shadcn** (`style: base-nova`, `baseColor: neutral`, `cssVariables: true`) · **`@base-ui/react`** as the primitive layer (NOT Radix in this repo) · `class-variance-authority` + `clsx` + `tailwind-merge` (`cn`) · **`lucide-react`** icons · **`next-themes`** (installed, used only by sonner) · **`sonner`** toasts · `tw-animate-css`. Tool-specific libs: `pdf-lib`, `pdfjs-dist`, `@imgly/background-removal`, `browser-image-compression`, `react-image-crop`, `prismjs`, `jszip`, `html-to-image`.
- **landing:** Vite + React 18 + **Tailwind v3** + `react-router-dom` + **`lucide-react`** + self-hosted `@fontsource-variable/{inter,bricolage-grotesque}`. No shadcn, no UI kit — hand-written components mirroring the tools look.
- **browser-start-page / block_chromium:** `chrome-extension-boilerplate-react-vite` Turborepo monorepos (Tailwind v3, shared `packages/tailwind-config` + `packages/ui`). Useful only for the named-hex palette tokens.
- **No `framer-motion`** anywhere. Motion is plain Tailwind `transition-all` + tiny `hover:-translate-y-0.5`/`rotate-12`. Brand feel is calm, not animated.
- **Icons:** lucide-react throughout. Brand icons (GitHub/LinkedIn) are hand-shipped SVGs (`tools/components/icons/brand-icons.tsx`) because lucide 1.x dropped brand glyphs.

---

## 9. Do / Don't

**Do**
- Default to the **warm near-white `#FEFDFB`** canvas with **warm-ink `#2A2720`** text. Keep it light.
- Use **amber `#EBB303`** sparingly as the accent: one highlighted hero word, icon tiles (`bg-primary/10 text-primary`), focus rings, the primary button.
- Put **dark ink (`#2A2720`) on amber**, never white — keeps contrast safe.
- Headings in **Bricolage Grotesque**, `font-medium` (500), `tracking-tight`, `-0.02em`. Body in **Inter**.
- Use **big rounding** (`rounded-2xl` cards, `rounded-xl` tiles, `rounded-lg` buttons, `rounded-full` pills) and `--radius: 1rem`.
- Lay everything out in **`max-w-6xl mx-auto px-6`** with `py-16 md:py-24` sections.
- Cards = **white, warm border, hover lift + `border-primary/40` + soft shadow**. Lean on borders/rings, not heavy shadows.
- Use the **🥱 emoji + "YawningFace"** wordmark as the logo.
- Use warm-tinted shadows (`rgba(42,39,32,…)`) and warm neutrals — nothing pure-gray/pure-black.

**Don't**
- Don't build a dark-mode-default page. Dark is optional and, when used, is **warm dark `#1B1814`**, never `#000`.
- Don't put white text on the amber button (the contrast bug to avoid).
- Don't use solid red for destructive — it's a soft tint (`bg-destructive/10 text-destructive`).
- Don't use bold/black heading weights or tight corporate small radii.
- Don't reach for framer-motion or flashy animation — keep micro-interactions to small translate/rotate.
- Don't use cool grays, pure-white page backgrounds, or pitch-black — always the warm tint.

---

### Source map (fact → file)
- Light tokens (hex): `yawningface_landing/tailwind.config.js`; (oklch): `tools/src/app/globals.css`.
- Dark tokens (hex): `browser-start-page/packages/tailwind-config/tailwind.config.ts`; (oklch): `tools/src/app/globals.css` `.dark`.
- Amber ramp + warm-shadow + warm-dark note: `browser-start-page/packages/tailwind-config/tailwind.config.ts`.
- Fonts: `tools/src/app/layout.tsx`, `yawningface_landing/src/main.jsx` + `index.css`.
- Buttons/badges/cards: `tools/src/components/ui/{button,badge,card}.tsx`.
- Nav/footer/hero/cards: `tools/src/components/layout/{site-header,site-footer}.tsx`, `tools/src/app/page.tsx`, `tools/src/components/tool/tool-hero.tsx`, `yawningface_landing/src/components/Landing/{Header,Hero,Products,Footer}.jsx`.
- Light-only confirmation: absence of `ThemeProvider`/toggle in `tools/src/app` + `tools/src/components/layout`; inline `#fefdfb` in `yawningface_landing/index.html`.
- Logo/brand icons: `tools/src/components/icons/brand-icons.tsx`.
