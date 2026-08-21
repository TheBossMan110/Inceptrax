import Link from "next/link"
import type { CSSProperties } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Aurora,
  Reveal,
  RevealGroup,
  RevealItem,
  SpotlightCard,
  AnimatedCounter,
} from "@/components/fx"
import {
  ArrowRight,
  CheckCircle2,
  Search,
  Rocket,
  TrendingUp,
  Layers,
  LayoutDashboard,
  FileDown,
} from "lucide-react"

/* ── Editorial type scale ────────────────────────────────
   Large sizes carry tight tracking; body stays open.       */

const DISPLAY_XL: CSSProperties = {
  fontSize: "clamp(2.75rem, 7.6vw, 5rem)",
  letterSpacing: "-0.045em",
  lineHeight: 0.99,
}
const DISPLAY_LG: CSSProperties = {
  fontSize: "clamp(2rem, 5vw, 3.5rem)",
  letterSpacing: "-0.035em",
  lineHeight: 1.05,
}

const PLANE_RECESSED: CSSProperties = {
  boxShadow: "inset 0 26px 50px -44px rgba(0,0,0,0.95), inset 0 1px 0 oklch(1 0 0 / 0.03)",
}
const PLANE_FLOATING: CSSProperties = {
  boxShadow: "0 48px 130px -50px rgba(0,0,0,0.9), 0 14px 36px -20px rgba(0,0,0,0.6)",
}

/* ── Content ─────────────────────────────────────────────── */

const features = [
  {
    title: "AI Idea Validation",
    description:
      "An instant, unbiased audit of your startup concept. We grade your idea on Problem-Solution fit, uniqueness, and feasibility so you know if it's worth pursuing.",
    details: "Uses multi-model reasoning to simulate VC scrutiny on your pitch.",
    icon: CheckCircle2,
  },
  {
    title: "Market & Competitor Analysis",
    description:
      "Deep-dive intelligence on your industry. Instantly identify who you're fighting against and how big the prize is (TAM/SAM/SOM).",
    details: "Scans thousands of market signals to find hidden competitors manual research misses.",
    icon: Search,
  },
  {
    title: "Validation Score System",
    description:
      "A proprietary 0-100 score indicating your startup's potential success rate. A single, clear metric to benchmark your ideas.",
    details: "Weighted algorithm factoring in market saturation, technical complexity, and demand.",
    icon: TrendingUp,
  },
  {
    title: "AI Reports & Insights",
    description:
      "Comprehensive, exportable business dossiers. Get a shared document for your co-founders or investors including monetization models and risks.",
    details: "Generates professional-grade documentation that looks like it took weeks to write.",
    icon: Layers,
  },
  {
    title: "GTM Strategy Assistance",
    description:
      "Your roadmap to $1M ARR. We identify specific marketing channels, content strategies, and sales funnels for your niche.",
    details: "Matches your business model with proven growth patterns from successful startups.",
    icon: Rocket,
  },
  {
    title: "Dashboard & Progress Tracking",
    description:
      "A central command center for all your potential ventures. Compare multiple ideas side-by-side and track evolution.",
    details: "Dynamic re-scoring as you update your idea inputs.",
    icon: LayoutDashboard,
  },
]

const ctaStats = [
  { value: 2, suffix: " min", label: "Average Analysis Time" },
  { value: 20, suffix: "+", label: "Data Points Analyzed" },
  { value: 100, suffix: "%", label: "Objective Feedback" },
]

/* ── Sample report data (illustrative preview) ───────────── */

const SAMPLE_IDEA = "AI fitness coach for busy parents"
const SAMPLE_SCORE = 87

const reportDimensions = [
  { label: "Problem–solution fit", value: 92 },
  { label: "Market size & growth", value: 78 },
  { label: "Competitive intensity", value: 64 },
  { label: "Technical feasibility", value: 85 },
  { label: "Monetization clarity", value: 81 },
  { label: "Timing & momentum", value: 88 },
]

const reportMetrics = [
  { label: "TAM", value: "$4.2B", note: "Total addressable" },
  { label: "SAM", value: "$860M", note: "Serviceable" },
  { label: "SOM", value: "$47M", note: "Obtainable · yr 3" },
  { label: "CAGR", value: "11.3%", note: "2024 – 2030" },
]

const reportCompetitors = [
  { name: "FitLoop", stage: "Series B", share: 34, gap: "No family or multi-user plans" },
  { name: "CoachIQ", stage: "Seed", share: 19, gap: "Generic plans, weak retention loop" },
  { name: "ParentFit", stage: "Bootstrapped", share: 11, gap: "No wearable or calendar sync" },
]

/* ── Report mockup primitives (static SVG / divs) ────────── */

function ScoreRing({ score }: { score: number }) {
  const r = 74
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-44 w-44 sm:h-52 sm:w-52 shrink-0">
      <div aria-hidden className="absolute inset-8 rounded-full bg-brand/20 blur-2xl" />
      <svg viewBox="0 0 176 176" className="relative h-full w-full -rotate-90" aria-hidden>
        <circle cx="88" cy="88" r={r} fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="9" />
        <circle
          cx="88"
          cy="88"
          r={r}
          fill="none"
          stroke="url(#featureScoreGradient)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
        />
        <defs>
          <linearGradient id="featureScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.75 0.13 215)" />
            <stop offset="55%" stopColor="oklch(0.585 0.222 277)" />
            <stop offset="100%" stopColor="oklch(0.64 0.24 305)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tabular-nums tracking-[-0.05em] text-gradient-subtle"
          style={{ fontSize: "clamp(2.75rem, 7vw, 3.75rem)", lineHeight: 1 }}
        >
          {score}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-muted-foreground mt-1.5">
          out of 100
        </span>
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* ── Hero — open, luminous plane ───────────────────── */}
        <section className="relative pt-40 pb-20 md:pt-48 md:pb-24 overflow-hidden">
          <Aurora />
          <div className="container px-4 relative z-10 max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="eyebrow mb-6">Product tour</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-balance mb-7 text-gradient-subtle" style={DISPLAY_XL}>
                The <span className="accent-serif text-gradient glow-text">Feature Suite</span> for
                Modern Founders
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed">
                Everything you need to go from &quot;hunch&quot; to &quot;validated business
                model&quot; without wasting time or money.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Instrument band — recessed plane ──────────────── */}
        <section
          className="relative hairline-t border-b border-white/[0.06] bg-[oklch(0.105_0.016_285)]"
          style={PLANE_RECESSED}
        >
          <div className="container px-4 max-w-5xl mx-auto">
            <RevealGroup className="grid grid-cols-1 sm:grid-cols-3">
              {ctaStats.map((stat, i) => (
                <RevealItem
                  key={stat.label}
                  className={cn(
                    "px-4 py-10 md:py-14 text-center",
                    i > 0 && "border-t sm:border-t-0 sm:border-l border-white/[0.06]"
                  )}
                >
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    className="block text-[clamp(2.1rem,4.6vw,3.25rem)] font-semibold leading-none tracking-[-0.045em] text-gradient-subtle"
                  />
                  <p className="text-[10px] md:text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 mt-4">
                    {stat.label}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── The deliverable — bordered showcase ───────────── */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute left-1/2 top-24 -translate-x-1/2 h-[420px] w-[900px] max-w-[120%] rounded-full bg-brand/[0.07] blur-[130px]"
          />
          <div className="container px-4 max-w-6xl mx-auto relative">
            <div className="grid lg:grid-cols-12 gap-8 items-end mb-12 md:mb-14">
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="eyebrow mb-5">The deliverable</p>
                </Reveal>
                <Reveal delay={0.08}>
                  <h2 className="text-gradient-subtle text-balance" style={DISPLAY_LG}>
                    This is what lands in your{" "}
                    <span className="accent-serif text-gradient">dashboard</span>
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.16} className="lg:col-span-5">
                <p className="text-muted-foreground leading-relaxed lg:text-right lg:pb-2">
                  A single validation score, the market sizing behind it, and the
                  competitors standing between you and it. Example report shown below.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.1} y={36}>
              <div className="relative rounded-[26px] border-gradient p-1.5" style={PLANE_FLOATING}>
                <div className="rounded-[20px] glass-strong overflow-hidden">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="ml-3 text-[11px] font-mono text-muted-foreground/70 truncate">
                      inceptrax.com/report/ai-fitness-coach
                    </span>
                    <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      <FileDown className="h-3 w-3" />
                      Export
                    </span>
                  </div>

                  {/* Report header */}
                  <div className="px-5 sm:px-8 pt-7 pb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70">
                        Validation report
                      </p>
                      <p className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] mt-2 truncate">
                        {SAMPLE_IDEA}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
                        <TrendingUp className="h-3 w-3" />
                        Strong potential
                      </span>
                      <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        8 stages complete
                      </span>
                    </div>
                  </div>

                  {/* Score + dimensions */}
                  <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 px-5 sm:px-8 pb-8 items-center">
                    <div className="flex justify-center lg:justify-start">
                      <ScoreRing score={SAMPLE_SCORE} />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                      {reportDimensions.map((d) => (
                        <div key={d.label}>
                          <div className="flex items-baseline justify-between gap-3 mb-2">
                            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/80 truncate">
                              {d.label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-foreground/85">
                              {d.value}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
                              style={{ width: `${d.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market sizing — metric row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/[0.06] bg-black/20">
                    {reportMetrics.map((m, i) => (
                      <div
                        key={m.label}
                        className={cn(
                          "px-5 py-6",
                          i % 2 === 1 && "border-l border-white/[0.06]",
                          i >= 2 && "border-t border-white/[0.06] md:border-t-0",
                          i !== 0 && "md:border-l md:border-white/[0.06]"
                        )}
                      >
                        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-brand-cyan/80">
                          {m.label}
                        </p>
                        <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em] mt-2">
                          {m.value}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">{m.note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Competitors — hairline rows */}
                  <div className="border-t border-white/[0.06]">
                    <div className="px-5 sm:px-8 pt-6 pb-3 flex items-center justify-between gap-4">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70">
                        Competitive set
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">
                        14 found · top 3
                      </p>
                    </div>
                    {reportCompetitors.map((c) => (
                      <div
                        key={c.name}
                        className="grid grid-cols-1 sm:grid-cols-[10rem_7rem_1fr] items-center gap-2 sm:gap-6 px-5 sm:px-8 py-4 border-t border-white/[0.05]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center text-[11px] font-semibold">
                            {c.name.slice(0, 2)}
                          </span>
                          <span className="font-medium text-sm truncate">{c.name}</span>
                        </div>
                        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                          {c.stage}
                        </span>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="hidden sm:block w-24 shrink-0">
                            <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-white/25"
                                style={{ width: `${c.share}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-[13px] text-muted-foreground truncate">{c.gap}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-center text-xs text-muted-foreground/60 mt-6">
                Illustrative example. Every report is generated from live research on your own idea.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Feature index — open canvas, two wide columns ── */}
        <section className="pb-24 md:pb-32">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-12 gap-8 items-end mb-12 md:mb-14">
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="eyebrow mb-5">The suite</p>
                </Reveal>
                <Reveal delay={0.08}>
                  <h2 className="text-gradient-subtle text-balance" style={DISPLAY_LG}>
                    Six systems, one{" "}
                    <span className="accent-serif text-gradient">verdict</span>
                  </h2>
                </Reveal>
              </div>
              <Reveal delay={0.16} className="lg:col-span-5">
                <p className="text-muted-foreground leading-relaxed lg:text-right lg:pb-2">
                  Each module feeds the next, so the score you get at the end is
                  backed by everything above it.
                </p>
              </Reveal>
            </div>

            <RevealGroup className="grid gap-4 md:grid-cols-2">
              {features.map((feature, i) => (
                <RevealItem key={feature.title}>
                  <SpotlightCard className="p-8 md:p-10 h-full card-premium-hover">
                    {/* Ghost numeral — footer wordmark DNA at card scale */}
                    <span
                      aria-hidden
                      className="pointer-events-none select-none absolute -top-4 -right-3 font-semibold tabular-nums leading-none tracking-tighter bg-gradient-to-b from-white/[0.07] to-transparent bg-clip-text text-transparent"
                      style={{ fontSize: "clamp(4rem, 8vw, 6.5rem)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-6">
                      <feature.icon className="h-5 w-5 text-brand-cyan" />
                    </div>
                    <h3 className="font-semibold text-xl md:text-2xl tracking-[-0.02em] mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-[15px] leading-relaxed mb-7 max-w-md">
                      {feature.description}
                    </p>
                    <div className="pt-6 border-t border-white/[0.06]">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-brand-cyan/80 mb-2">
                        The AI Edge
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {feature.details}
                      </p>
                    </div>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Closing statement — the giant typographic moment ── */}
        <section className="relative overflow-hidden pb-28 md:pb-36">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[340px] w-[880px] max-w-[115%] rounded-full bg-brand/10 blur-[140px]"
          />
          <div className="container px-4 max-w-5xl mx-auto relative">
            <div className="divider-glow" />

            <div className="py-20 md:py-28 text-center">
              <Reveal>
                <p className="eyebrow mb-8">One platform</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2
                  className="text-gradient-subtle text-balance mx-auto max-w-4xl"
                  style={DISPLAY_XL}
                >
                  Built for speed, designed for{" "}
                  <span className="accent-serif text-gradient">clarity</span>.
                </h2>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mt-8 leading-relaxed">
                  Stop using spreadsheets and disjointed tools. Inceptrax brings your entire
                  validation workflow into one intelligent platform.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-12">
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
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
