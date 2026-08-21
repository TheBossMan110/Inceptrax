# Inceptrax Design System — "Midnight Aurora"

Dark-first luxury UI. Deep indigo canvas, electric-indigo brand, aurora gradients,
glass surfaces, serif italic accents. Every page must feel like one product.

## Non-negotiable rules

1. **Never change business logic.** API calls, state, handlers, routing, data shapes stay identical. Presentation only.
2. **Do not edit**: `app/globals.css`, `app/layout.tsx`, `components/fx/*`, `components/ui/*`, `components/navbar.tsx`, `components/footer.tsx`, `components/dashboard-sidebar.tsx`, `components/dashboard-header.tsx`, `app/dashboard/layout.tsx`. Use them, don't touch them.
3. **No emojis as icons.** Use `lucide-react` icons inside gradient chips (see pattern below).
4. **No new dependencies.** framer-motion, lucide, shadcn/ui are already installed.
5. Keep pages responsive (mobile-first) and respect `prefers-reduced-motion` (the fx components already do).

## Tokens (Tailwind classes)

- Canvas: `bg-background` (deep indigo-black) · Cards: `bg-card`
- Brand colors: `brand` (electric indigo), `brand-violet`, `brand-cyan`, `brand-fuchsia`
  — usable as `text-brand`, `bg-brand/10`, `border-brand/25`, etc.
- Status: `success`, `warning`, `danger` (e.g. `text-success`, `bg-success/10`)
- Muted text: `text-muted-foreground` · Borders: `border-white/[0.06]` to `border-white/10`
- Radius: default `rounded-xl` for controls, `rounded-2xl` for cards.

## Signature utility classes (defined in globals.css)

- `card-premium` — card with inner top-light + fine border. Combine: `rounded-2xl card-premium p-6`
- `card-premium-hover` — adds lift + indigo glow on hover
- `glass` / `glass-strong` — frosted surfaces (headers, badges, overlays)
- `text-gradient` — cyan→indigo→violet gradient text (use on 1–2 accent words max)
- `text-gradient-subtle` — white→gray vertical fade for big headings
- `accent-serif` — Instrument Serif italic (use on ONE accent word in a heading)
- `eyebrow` — mono uppercase tracked section label (cyan)
- `glow-primary` — indigo glow shadow for primary CTAs
- `shimmer` — light sweep across a button on hover
- `press` — scale-down on :active
- `divider-glow` — centered gradient hairline `<div className="divider-glow" />`
- `border-gradient` — 1px gradient border wrapper (use `relative rounded-2xl border-gradient`)
- `bg-grid bg-grid-fade` — masked blueprint grid backdrop
- `skeleton` — shimmer loading block
- Animations: `animate-fade-in`, `animate-fade-up`, `animate-float`, `animate-pulse-glow`, `animate-gradient-x`

## FX components (`@/components/fx`)

```tsx
import { Aurora, Reveal, RevealGroup, RevealItem, AnimatedCounter, SpotlightCard, Marquee } from "@/components/fx"
```

- `<Aurora />` — drifting gradient-orb backdrop. Parent needs `relative overflow-hidden`. Marketing/hero sections only, `intensity="subtle"` for secondary sections.
- `<Reveal delay={0.1}>` — scroll-reveal wrapper (fade + rise + blur). Marketing pages: use freely. Dashboard: only on page-level mount, keep snappy.
- `<RevealGroup>` + `<RevealItem>` — staggered grid/list reveals.
- `<AnimatedCounter value={87} suffix="%" />` — counts up in view.
- `<SpotlightCard className="p-6">` — mouse-tracking glow card (already `card-premium rounded-2xl`).
- `<Marquee>` — infinite scroller with edge fade.

## Patterns

**Primary CTA button**
```tsx
<Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press">
  Label <ArrowRight className="h-4 w-4" />
</Button>
```

**Secondary button**: `variant="outline"` + `rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07]`

**Icon chip (replaces emoji)**
```tsx
<div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
  <Icon className="h-5 w-5 text-brand-cyan" />
</div>
```

**Section header (marketing)**
```tsx
<p className="eyebrow mb-4">Section label</p>
<h2 className="text-gradient-subtle">Heading with <span className="accent-serif text-gradient">accent</span></h2>
```

**Page header (dashboard)**
```tsx
<div className="mb-6">
  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Page title</h1>
  <p className="text-sm text-muted-foreground mt-1">Short description.</p>
</div>
```

**Stat tile (dashboard)**
```tsx
<div className="card-premium rounded-2xl p-5">
  <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Label</p>
  <p className="text-2xl font-bold tabular-nums mt-1.5">{value}</p>
</div>
```

**Score badge**: `bg-success/10 text-success border border-success/25 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums` (swap success→warning/danger by score).

**Empty state**: centered icon chip + heading + muted copy + primary CTA, inside `card-premium rounded-2xl py-16`.

**Loading**: use `skeleton` blocks matching final layout, never bare spinners for full pages.

**Forms**: shadcn `Input`/`Textarea` are fine — wrap card in `card-premium rounded-2xl p-6 md:p-8`; labels `text-xs font-medium text-muted-foreground`; on auth pages add `<Aurora />` backdrop.

## Motion doctrine

- Ease: `cubic-bezier(0.22,1,0.36,1)`, durations 200–700ms. Nothing bounces.
- Marketing pages: generous reveals, aurora, marquee, counters.
- Dashboard pages: fast + minimal — `animate-fade-up` on mount, stagger 40–70ms on lists (framer `staggerChildren: 0.05`), hover lifts via `card-premium-hover`. Never block reading with animation.
- Decorative motion must be `aria-hidden` and pointer-events-none.
