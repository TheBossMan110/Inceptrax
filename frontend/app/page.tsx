"use client"

import Link from "next/link"
import Script from "next/script"
import { useEffect, useState, type CSSProperties } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { cn } from "@/lib/utils"
import { Aurora, Reveal, RevealGroup, RevealItem, AnimatedCounter, SpotlightCard, Marquee, Parallax, ScrollFade, Magnetic } from "@/components/fx"
import {
  ArrowRight,
  Target,
  CreditCard,
  Zap,
  Rocket,
  Sparkles,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Star,
} from "lucide-react"

/* ── Editorial type scale ────────────────────────────────
   Big sizes carry tight tracking; small sizes stay open.   */

const DISPLAY_XL: CSSProperties = {
  fontSize: "clamp(2.75rem, 7.6vw, 5.25rem)",
  letterSpacing: "-0.045em",
  lineHeight: 0.98,
}
const DISPLAY_LG: CSSProperties = {
  fontSize: "clamp(2rem, 5vw, 3.5rem)",
  letterSpacing: "-0.035em",
  lineHeight: 1.05,
}

/* Depth: planes sit at different heights, not all on the page surface. */
const PLANE_RECESSED: CSSProperties = {
  boxShadow: "inset 0 26px 50px -44px rgba(0,0,0,0.95), inset 0 1px 0 oklch(1 0 0 / 0.03)",
}
const PLANE_RAISED: CSSProperties = {
  boxShadow: "0 44px 120px -52px rgba(0,0,0,0.95), inset 0 1px 0 oklch(1 0 0 / 0.06)",
}
const PLANE_FLOATING: CSSProperties = {
  boxShadow: "0 40px 110px -40px rgba(0,0,0,0.85), 0 12px 32px -18px rgba(0,0,0,0.6)",
}

/* ── Content ─────────────────────────────────────────────── */

const features = [
  {
    icon: Sparkles,
    title: "Idea Validation",
    desc: "Score your idea across 6 dimensions with real market data and AI-driven analysis.",
    wide: true,
    visual: "dimensions" as const,
  },
  {
    icon: BarChart3,
    title: "Market Research",
    desc: "Live TAM, SAM, SOM data with CAGR and trend analysis sourced from the web.",
    wide: false,
    visual: null,
  },
  {
    icon: Target,
    title: "Competitor Analysis",
    desc: "Real competitor names, weaknesses, and market gaps you can exploit.",
    wide: false,
    visual: null,
  },
  {
    icon: CreditCard,
    title: "Monetization Strategy",
    desc: "Revenue models, pricing tiers, and LTV:CAC benchmarks tailored to your idea.",
    wide: false,
    visual: null,
  },
  {
    icon: Zap,
    title: "MVP Blueprint",
    desc: "Feature roadmap, tech stack recommendations, and budget breakdown.",
    wide: false,
    visual: null,
  },
  {
    icon: Rocket,
    title: "Go-To-Market",
    desc: "Launch channels, 90-day action plan, and customer acquisition targets.",
    wide: true,
    visual: "launch" as const,
  },
]

const steps = [
  {
    num: "01",
    title: "Describe your idea",
    desc: "Type your startup concept in plain language. No forms, no complexity.",
  },
  {
    num: "02",
    title: "AI analyzes in real-time",
    desc: "8 sequential AI stages run with live web research for accurate, current data.",
  },
  {
    num: "03",
    title: "Get your full report",
    desc: "Scores, insights, investor pitches, and a 90-day action plan — in minutes.",
  },
]

const stats = [
  { value: 2400, suffix: "+", label: "Ideas validated" },
  { value: 87, suffix: "%", label: "Avg accuracy score" },
  { value: 8, suffix: "", label: "Analysis stages" },
  { value: 3, suffix: " min", label: "Average analysis time" },
]

const testimonials = [
  {
    quote:
      "Inceptrax saved me 6 months of dev time. It correctly identified a saturated market I was about to enter and suggested a pivot that got us funded.",
    name: "Sarah J.",
    role: "Founder, TechFlow",
    initials: "SJ",
  },
  {
    quote:
      "The MVP blueprint feature is insane. It prioritized my features better than my actual product manager. Essential for indie hackers.",
    name: "David K.",
    role: "Indie Hacker",
    initials: "DK",
  },
]

const tickerItems = [
  "Idea Validation",
  "Market Research",
  "Competitor Analysis",
  "Audience Insights",
  "Monetization Strategy",
  "MVP Blueprint",
  "Go-To-Market Plan",
  "Investor Pitch",
]

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Inceptrax",
  url: "https://www.inceptrax.com",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered startup idea validation tool. Validate your business idea with market research, competitor analysis, monetization strategy, and a go-to-market plan.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free startup idea validation",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "2400",
    bestRating: "5",
  },
}

/* ── Hero product preview (animated mock) ────────────────── */

const previewStages = [
  "Idea Validation",
  "Market Research",
  "Competitor Scan",
  "Audience Analysis",
  "Monetization",
  "MVP Blueprint",
  "Go-To-Market",
  "Final Synthesis",
]

const previewMetrics = [
  { label: "TAM", value: "$4.2B" },
  { label: "Competitors", value: "14" },
  { label: "CAGR", value: "11.3%" },
]

function HeroPreview() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(reduced ? previewStages.length : 2)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      setActive((a) => (a >= previewStages.length + 2 ? 0 : a + 1))
    }, 1100)
    return () => clearInterval(t)
  }, [reduced])

  const score = Math.min(87, Math.round((Math.min(active, previewStages.length) / previewStages.length) * 87))
  const R = 44
  const C = 2 * Math.PI * R

  return (
    <div className="relative rounded-[26px] border-gradient p-1.5" style={PLANE_FLOATING}>
      <div className="rounded-[20px] glass-strong overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-[11px] font-mono text-muted-foreground/70 truncate">
            inceptrax.com/dashboard — analyzing “AI fitness coach for busy parents”
          </span>
        </div>

        <div className="grid sm:grid-cols-[1fr_15rem]">
          {/* Stage list */}
          <div className="space-y-2 min-w-0 p-5 sm:p-6">
            {previewStages.map((stage, i) => {
              const done = i < active
              const running = i === active
              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-500 ${
                    done
                      ? "bg-white/[0.04] text-foreground/90"
                      : running
                        ? "bg-brand/10 text-foreground border border-brand/25"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : running ? (
                    <Loader2 className="h-4 w-4 shrink-0 text-brand animate-spin motion-reduce:animate-none" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-white/15" />
                  )}
                  <span className="truncate font-medium">{stage}</span>
                  {running && (
                    <span className="ml-auto text-[10px] font-mono text-brand animate-pulse-glow">
                      running…
                    </span>
                  )}
                  {done && (
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">done</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Score ring — its own recessed plane */}
          <div
            className="flex sm:flex-col items-center justify-center gap-5 p-6 border-t sm:border-t-0 sm:border-l border-white/[0.06] bg-black/15"
            style={PLANE_RECESSED}
          >
            <div className="relative h-32 w-32 shrink-0">
              <div aria-hidden className="absolute inset-5 rounded-full bg-brand/20 blur-2xl" />
              <svg viewBox="0 0 100 100" className="relative h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={R} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="7" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  animate={{ strokeDashoffset: C - (C * score) / 100 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="oklch(0.75 0.13 215)" />
                    <stop offset="55%" stopColor="oklch(0.585 0.222 277)" />
                    <stop offset="100%" stopColor="oklch(0.64 0.24 305)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums tracking-[-0.04em]">{score}</span>
                <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground mt-0.5">
                  score
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-[11px] font-medium text-success">
              <TrendingUp className="h-3 w-3" />
              Strong potential
            </div>
          </div>
        </div>

        {/* Metric strip — hairline-divided, like a real report footer */}
        <div className="grid grid-cols-3 border-t border-white/[0.06] bg-black/20">
          {previewMetrics.map((m, i) => (
            <div
              key={m.label}
              className={cn("px-4 py-4 text-center", i > 0 && "border-l border-white/[0.06]")}
            >
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                {m.label}
              </p>
              <p className="text-sm font-semibold tabular-nums mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── In-card product visuals (wide bento cells) ──────────── */

const dimensionSample = [
  { label: "Problem–solution fit", v: 92 },
  { label: "Market size", v: 78 },
  { label: "Feasibility", v: 85 },
]

function DimensionStrip() {
  return (
    <div className="w-full lg:w-60 rounded-xl border border-white/[0.06] bg-black/25 p-4 space-y-3.5">
      {dimensionSample.map((d) => (
        <div key={d.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 truncate">
              {d.label}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-foreground/85">{d.v}</span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
              style={{ width: `${d.v}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const launchSample = [
  { k: "Day 0–30", v: "Beachhead channel" },
  { k: "Day 31–60", v: "Content engine" },
  { k: "Day 61–90", v: "Paid scale test" },
]

function LaunchStrip() {
  return (
    <div className="w-full lg:w-60 rounded-xl border border-white/[0.06] bg-black/25 p-4">
      <div className="relative pl-5 space-y-4">
        <span
          aria-hidden
          className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-brand-cyan/50 via-brand/40 to-transparent"
        />
        {launchSample.map((p) => (
          <div key={p.k} className="relative">
            <span aria-hidden className="absolute -left-5 top-1.5 h-[7px] w-[7px] rounded-full bg-brand" />
            <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
              {p.k}
            </p>
            <p className="text-[13px] font-medium text-foreground/85 mt-0.5">{p.v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <main className="flex-grow">
        {/* ── Hero — open, luminous plane ───────────────────── */}
        <section className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden">
          {/* The backdrop drifts slower than the page, so the hero reads as a
              plane floating above it rather than a flat block of colour. */}
          <Parallax speed={-0.28} className="absolute inset-0 -z-10">
            <Aurora />
          </Parallax>

          {/* Sweeping light beam along the top edge */}
          <div aria-hidden className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div className="h-px w-1/3 bg-gradient-to-r from-transparent via-brand to-transparent animate-beam" />
          </div>

          <div className="container px-4 relative z-10 max-w-6xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <Reveal delay={0}>
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-9">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                  </span>
                  AI-powered startup analysis · 8 deep stages
                </div>
              </Reveal>

              <h1
                className="text-balance mb-7 text-gradient-subtle"
                style={DISPLAY_XL}
                aria-label="Validate your startup idea before you build"
              >
                <span aria-hidden>
                  {["Validate", "your", "startup", "idea"].map((word, i) => (
                    <motion.span
                      key={word}
                      className="inline-block mr-[0.22em]"
                      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, delay: 0.12 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <motion.span
                    className="inline-block mr-[0.22em] accent-serif text-gradient glow-text"
                    initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.7, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
                  >
                    before
                  </motion.span>
                  {["you", "build"].map((word, i) => (
                    <motion.span
                      key={word}
                      className="inline-block mr-[0.22em]"
                      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.7, delay: 0.57 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </h1>

              <Reveal delay={0.16}>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-11">
                  AI-powered analysis across 8 stages — market research, competitors,
                  monetization, MVP planning, and more. In minutes, not months.
                </p>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                  <Magnetic className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="h-13 px-8 text-base gap-2 w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
                      asChild
                    >
                      <Link href="/register">
                        Analyze Your Idea Free <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </Magnetic>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-13 px-8 text-base w-full sm:w-auto rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] backdrop-blur-sm"
                    asChild
                  >
                    <Link href="/features">See Example Report</Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={0.32}>
                <p className="text-xs text-muted-foreground/70 mt-6 flex items-center justify-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" /> No credit card required
                  </span>
                  <span>·</span>
                  <span>Takes 3 minutes</span>
                  <span>·</span>
                  <span>2,400+ ideas validated</span>
                </p>
              </Reveal>
            </div>

            {/* Product preview, staged on receding planes */}
            <Reveal delay={0.4} y={40} className="mt-20 md:mt-28 max-w-4xl mx-auto">
              <div className="relative">
                {/* Ambient bloom */}
                <div aria-hidden className="absolute -inset-12 bg-brand/10 blur-[110px] rounded-full" />
                {/* Receding planes behind the panel — depth without extra hues */}
                <div
                  aria-hidden
                  className="absolute -top-8 left-[9%] right-[9%] h-32 rounded-t-[28px] border border-white/[0.05] bg-white/[0.015]"
                />
                <div
                  aria-hidden
                  className="absolute -top-4 left-[4.5%] right-[4.5%] h-32 rounded-t-[28px] border border-white/[0.07] bg-white/[0.03]"
                />

                {/* Floating chips (md+) */}
                <div aria-hidden className="hidden md:block absolute -top-7 -right-10 z-20 animate-float">
                  <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] flex items-center gap-2.5">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground leading-none">TAM</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">$4.2B</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="hidden md:block absolute top-1/3 -left-14 z-20 animate-float [animation-delay:-2.2s]">
                  <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-brand-cyan" />
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground leading-none">AI Score</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">87 / 100</p>
                    </div>
                  </div>
                </div>
                <div aria-hidden className="hidden md:block absolute -bottom-6 -right-6 z-20 animate-float [animation-delay:-4s]">
                  <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] flex items-center gap-2.5">
                    <Target className="h-4 w-4 text-brand-violet" />
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground leading-none">Competitors</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">14 found</p>
                    </div>
                  </div>
                </div>

                <HeroPreview />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Proof band — recessed plane (ticker + instrument row) ── */}
        <section
          className="relative hairline-t border-b border-white/[0.06] bg-[oklch(0.105_0.016_285)]"
          style={PLANE_RECESSED}
        >
          <div className="py-7 border-b border-white/[0.05]">
            <Marquee duration={44}>
              {tickerItems.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-muted-foreground/60 whitespace-nowrap"
                >
                  <span className="h-1 w-1 rounded-full bg-brand/60" />
                  {item}
                </span>
              ))}
            </Marquee>
          </div>

          <div className="container px-4 max-w-6xl mx-auto">
            <RevealGroup className="grid grid-cols-2 md:grid-cols-4">
              {stats.map((stat, i) => (
                <RevealItem
                  key={stat.label}
                  className={cn(
                    "px-4 py-12 md:py-16 text-center",
                    i % 2 === 1 && "border-l border-white/[0.06]",
                    i >= 2 && "border-t border-white/[0.06] md:border-t-0",
                    i !== 0 && "md:border-l md:border-white/[0.06]"
                  )}
                >
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    className="block text-[clamp(2.1rem,4.6vw,3.25rem)] font-semibold tracking-[-0.045em] leading-none text-gradient-subtle"
                  />
                  <p className="text-[10px] md:text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 mt-4">
                    {stat.label}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Features — open canvas, editorial header ──────── */}
        <section className="py-28 md:py-36 relative" id="features">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-12 gap-8 items-end mb-14 md:mb-16">
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="eyebrow mb-5">What you get</p>
                </Reveal>
                <Reveal delay={0.08}>
                  <h2 className="text-gradient-subtle text-balance" style={DISPLAY_LG}>
                    Everything you need to{" "}
                    <span className="accent-serif text-gradient">validate fast</span>
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.16} className="lg:col-span-5">
                <p className="text-muted-foreground leading-relaxed lg:text-right lg:pb-2">
                  8 sequential AI stages built for founders who move fast and need
                  accurate data — not opinions.
                </p>
              </Reveal>
            </div>

            <RevealGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <RevealItem key={f.title} className={f.wide ? "lg:col-span-2" : ""}>
                  <SpotlightCard className="p-7 md:p-8 h-full card-premium-hover">
                    <div
                      className={cn(
                        "h-full",
                        f.wide && "lg:flex lg:items-center lg:gap-10"
                      )}
                    >
                      <div className={cn(f.wide && "flex-1 min-w-0")}>
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                          <f.icon className="h-5 w-5 text-brand-cyan" />
                        </div>
                        <h3 className="font-semibold text-xl tracking-[-0.015em] mb-2.5">{f.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-md">{f.desc}</p>
                      </div>
                      {f.visual === "dimensions" && (
                        <div className="mt-6 lg:mt-0 lg:shrink-0">
                          <DimensionStrip />
                        </div>
                      )}
                      {f.visual === "launch" && (
                        <div className="mt-6 lg:mt-0 lg:shrink-0">
                          <LaunchStrip />
                        </div>
                      )}
                    </div>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── How It Works — bordered showcase, raised plane ── */}
        <section className="py-24 md:py-32 relative overflow-hidden" id="how-it-works">
          <Aurora intensity="subtle" grid={false} />
          <div className="container px-4 max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-14 md:mb-16">
              <Reveal>
                <p className="eyebrow mb-5">Simple process</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="text-gradient-subtle" style={DISPLAY_LG}>
                  How it <span className="accent-serif text-gradient">works</span>
                </h2>
              </Reveal>
            </div>

            <Reveal delay={0.12}>
              <div
                className="rounded-3xl card-premium overflow-hidden"
                style={PLANE_RAISED}
              >
                <div className="grid md:grid-cols-3">
                  {steps.map((step, i) => (
                    <div
                      key={step.num}
                      className={cn(
                        "relative p-8 md:p-10 lg:p-12 overflow-hidden",
                        i > 0 && "border-t md:border-t-0 md:border-l border-white/[0.06]"
                      )}
                    >
                      {/* Ghost numeral — the footer's wordmark trick, at card scale */}
                      <span
                        aria-hidden
                        className="pointer-events-none select-none absolute top-0 right-5 font-semibold tabular-nums leading-none tracking-tighter bg-gradient-to-b from-white/[0.07] to-transparent bg-clip-text text-transparent"
                        style={{ fontSize: "clamp(4.5rem, 9vw, 7rem)" }}
                      >
                        {step.num}
                      </span>

                      <p className="eyebrow relative">{step.num}</p>
                      <h3 className="font-semibold text-xl tracking-[-0.015em] mt-6 mb-3 relative">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed relative max-w-xs">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── The number — one giant typographic moment ─────── */}
        <section className="relative overflow-hidden py-24 md:py-36">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[820px] max-w-[110%] rounded-full bg-brand/10 blur-[130px]"
          />
          <div className="container px-4 max-w-5xl mx-auto relative text-center">
            <div className="divider-glow" />
            <div className="py-14 md:py-20">
              <ScrollFade lift={80}>
                <AnimatedCounter
                  value={40}
                  prefix="$"
                  suffix="M+"
                  className="block text-[clamp(4rem,15vw,11rem)] font-semibold leading-[0.85] tracking-[-0.055em] text-gradient-subtle"
                />
              </ScrollFade>
              <Reveal delay={0.12}>
                <p className="mt-8 md:mt-10 text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
                  in potential wasted development hours{" "}
                  <span className="accent-serif text-gradient">saved</span> this year.
                </p>
              </Reveal>
            </div>
            <div className="divider-glow" />
          </div>
        </section>

        {/* ── Testimonials — open canvas ────────────────────── */}
        <section className="pb-24 md:pb-32">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="text-center mb-14 md:mb-16">
              <Reveal>
                <p className="eyebrow mb-5">Real founders</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="text-gradient-subtle text-balance" style={DISPLAY_LG}>
                  Trusted by <span className="accent-serif text-gradient">5,000+</span> modern founders
                </h2>
              </Reveal>
            </div>

            <RevealGroup className="grid md:grid-cols-2 gap-5">
              {testimonials.map((t) => (
                <RevealItem key={t.name}>
                  <SpotlightCard className="p-8 md:p-10 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex gap-1" aria-hidden>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 text-warning fill-warning/70" />
                        ))}
                      </div>
                      <span
                        aria-hidden
                        className="accent-serif text-5xl leading-none text-brand/25 -mt-4 select-none"
                      >
                        &rdquo;
                      </span>
                    </div>
                    <blockquote className="text-foreground/90 text-lg md:text-xl leading-relaxed tracking-[-0.01em] mb-8 flex-1">
                      {t.quote}
                    </blockquote>
                    <div className="flex items-center gap-3.5 pt-6 border-t border-white/[0.06]">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-brand-violet p-[1.5px]">
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-semibold text-sm">
                          {t.initials}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Final CTA — floating luminous plane ───────────── */}
        <section className="pb-28 md:pb-36 px-4">
          <Reveal className="container max-w-5xl mx-auto">
            <div
              className="relative rounded-[30px] border-gradient p-px"
              style={{
                boxShadow:
                  "0 60px 140px -60px oklch(0.585 0.222 277 / 0.5), 0 30px 80px -40px rgba(0,0,0,0.9)",
              }}
            >
              <div className="relative rounded-[29px] overflow-hidden text-center px-6 py-20 md:py-28 bg-card">
                <Aurora grid={false} />
                <div className="relative z-10">
                  <p className="eyebrow mb-6">Start now — it&apos;s free</p>
                  <h2 className="mb-5 text-gradient-subtle text-balance mx-auto max-w-3xl" style={DISPLAY_LG}>
                    Ready to validate <span className="accent-serif text-gradient">your idea?</span>
                  </h2>
                  <p className="text-muted-foreground mb-11 text-lg max-w-md mx-auto">
                    Stop guessing. Start building the right thing.
                  </p>
                  <Button
                    size="lg"
                    className="h-13 px-10 text-base rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/register">
                      Start Free Analysis <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground/70 mt-6">
                    No credit card · Free to start · 3 minutes to insights
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  )
}
