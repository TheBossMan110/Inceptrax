"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Aurora, Reveal, RevealGroup, RevealItem } from "@/components/fx"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Check, Zap, Crown, Rocket, Building2, ArrowRight, Sparkles, ShieldCheck,
} from "lucide-react"

interface Tier {
  id: string
  label: string
  currency: string
  price: number
  price_display: string
  credits_per_month: number
  max_ideas: number
  max_analyses_per_month: number
  analyses_display: string
  agents_allowed: string[]
  premium_models: boolean
  rag_queries_per_day: number
  websites_allowed: number
  recommended: boolean
}

type Currency = "USD" | "PKR"

/** Qualitative differentiators. Every number on the page comes from the API. */
const EXTRAS: Record<string, { icon: React.ElementType; chip: string; accent: string; perks: string[] }> = {
  free: {
    icon: Zap,
    chip: "bg-white/[0.05] border-white/[0.08]",
    accent: "text-muted-foreground",
    perks: ["Core analysis pillars", "Basic PDF report", "Community features"],
  },
  starter: {
    icon: Rocket,
    chip: "bg-gradient-to-br from-brand-cyan/25 to-brand/10 border-brand-cyan/25",
    accent: "text-brand-cyan",
    perks: ["All 14 analysis pillars", "PDF + PPT export", "Competitor Watch", "Email support"],
  },
  pro: {
    icon: Crown,
    chip: "bg-gradient-to-br from-brand-violet/30 to-brand/15 border-brand-violet/25",
    accent: "text-brand-violet",
    perks: ["Premium AI models", "All 4 AI agents", "Ask Anything (RAG)", "Priority support"],
  },
  enterprise: {
    icon: Building2,
    chip: "bg-gradient-to-br from-warning/25 to-warning/5 border-warning/25",
    accent: "text-warning",
    perks: ["White-label reports", "API access", "SLA + dedicated support", "Onboarding assistance"],
  },
}

/**
 * Rendered immediately so the page never shows skeletons to a visitor.
 *
 * The API is the source of truth and overwrites this the moment it responds —
 * but a public pricing page must not depend on a backend that may be cold
 * starting. These mirror TIER_CONFIG; if they ever drift, the API wins.
 */
const FALLBACK_TIERS: Record<Currency, Tier[]> = {
  USD: [
    { id: "free", label: "Free", currency: "USD", price: 0, price_display: "Free", credits_per_month: 100, max_ideas: 3, max_analyses_per_month: 3, analyses_display: "3 validations/mo", agents_allowed: ["progress_coach"], premium_models: false, rag_queries_per_day: 5, websites_allowed: 0, recommended: false },
    { id: "starter", label: "Starter", currency: "USD", price: 9, price_display: "$9", credits_per_month: 500, max_ideas: 15, max_analyses_per_month: 15, analyses_display: "15 validations/mo", agents_allowed: [], premium_models: false, rag_queries_per_day: 50, websites_allowed: 0, recommended: false },
    { id: "pro", label: "Pro", currency: "USD", price: 19, price_display: "$19", credits_per_month: 2000, max_ideas: 50, max_analyses_per_month: 60, analyses_display: "60 validations/mo", agents_allowed: [], premium_models: true, rag_queries_per_day: 200, websites_allowed: 1, recommended: true },
    { id: "enterprise", label: "Enterprise", currency: "USD", price: 49, price_display: "$49", credits_per_month: 6000, max_ideas: 500, max_analyses_per_month: 200, analyses_display: "Unlimited (fair use: 200/mo)", agents_allowed: [], premium_models: true, rag_queries_per_day: 1000, websites_allowed: 10, recommended: false },
  ],
  PKR: [
    { id: "free", label: "Free", currency: "PKR", price: 0, price_display: "Free", credits_per_month: 100, max_ideas: 3, max_analyses_per_month: 3, analyses_display: "3 validations/mo", agents_allowed: ["progress_coach"], premium_models: false, rag_queries_per_day: 5, websites_allowed: 0, recommended: false },
    { id: "starter", label: "Starter", currency: "PKR", price: 2500, price_display: "PKR 2,500", credits_per_month: 500, max_ideas: 15, max_analyses_per_month: 15, analyses_display: "15 validations/mo", agents_allowed: [], premium_models: false, rag_queries_per_day: 50, websites_allowed: 0, recommended: false },
    { id: "pro", label: "Pro", currency: "PKR", price: 4500, price_display: "PKR 4,500", credits_per_month: 2000, max_ideas: 50, max_analyses_per_month: 60, analyses_display: "60 validations/mo", agents_allowed: [], premium_models: true, rag_queries_per_day: 200, websites_allowed: 1, recommended: true },
    { id: "enterprise", label: "Enterprise", currency: "PKR", price: 14999, price_display: "PKR 14,999", credits_per_month: 6000, max_ideas: 500, max_analyses_per_month: 200, analyses_display: "Unlimited (fair use: 200/mo)", agents_allowed: [], premium_models: true, rag_queries_per_day: 1000, websites_allowed: 10, recommended: false },
  ],
}

const FAQ = [
  {
    q: "What is a credit?",
    a: "Credits meter the AI work you run. A full 8-stage analysis costs 30, a stress test 3, a one-line pitch 1. Exports, PDF and PPT, and messaging are always free.",
  },
  {
    q: "What happens when I run out?",
    a: "Nothing breaks — paid features simply pause until your credits reset at the start of your next billing period, or you upgrade. You never get an unexpected bill.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Credits reset to your plan's amount each month rather than accumulating. That's what keeps the pricing sustainable and predictable.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel whenever you like and you keep full access until the end of the period you already paid for. No cancellation fee, no lock-in.",
  },
  {
    q: "Why are there PKR and USD prices?",
    a: "Inceptrax is built in Pakistan. Local pricing reflects local purchasing power, while international customers are billed in USD.",
  },
]

export default function PricingPage() {
  const [tiers, setTiers] = useState<Tier[]>(FALLBACK_TIERS.USD)
  const [currency, setCurrency] = useState<Currency>("USD")
  const [yearly, setYearly] = useState(false)

  // Default to PKR for visitors in Pakistan; the toggle still wins.
  useEffect(() => {
    try {
      if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Karachi") {
        setCurrency("PKR")
      }
    } catch { /* keep USD */ }
  }, [])

  const load = useCallback(async (cur: Currency) => {
    // Show the correct currency instantly, then let the API confirm it.
    setTiers(FALLBACK_TIERS[cur])
    try {
      const res = await apiFetch(`/billing/tiers?currency=${cur}`)
      if (res?.tiers?.length) setTiers(res.tiers)
    } catch {
      // Keep the fallback — a cold backend must not blank the pricing page.
    }
  }, [])

  useEffect(() => { load(currency) }, [currency, load])

  const fmt = (n: number) =>
    currency === "PKR" ? `PKR ${n.toLocaleString()}` : `$${n.toLocaleString()}`

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative pt-36 pb-14 md:pt-44 md:pb-16 overflow-hidden">
          <Aurora />
          <div className="container px-4 max-w-3xl mx-auto text-center relative z-10">
            <Reveal>
              <p className="eyebrow mb-4">Pricing</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-balance mb-5 text-gradient-subtle">
                Start free. Pay when it{" "}
                <span className="accent-serif text-gradient glow-text">earns it</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every plan includes the full 8-stage analysis engine. Paid plans add
                volume, premium AI models, and agents that keep watching your market.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <button
                    onClick={() => setYearly(false)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 press",
                      !yearly ? "bg-white/[0.09] text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setYearly(true)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 press flex items-center gap-1.5",
                      yearly ? "bg-brand-violet/15 text-brand-violet" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Yearly <span className="text-[11px] text-success">Save 17%</span>
                  </button>
                </div>

                <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  {(["USD", "PKR"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[13px] font-mono font-semibold transition-all duration-200 press",
                        currency === c ? "bg-white/[0.09] text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Plans ────────────────────────────────────────── */}
        <section className="pb-20 px-4">
          <div className="container max-w-6xl mx-auto">
            {(
              <RevealGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 items-stretch">
                {tiers.map((tier) => {
                  const extras = EXTRAS[tier.id] || EXTRAS.free
                  const Icon = extras.icon
                  const isFree = tier.price === 0
                  const popular = tier.recommended
                  const price = isFree ? "Free" : yearly ? fmt(tier.price * 10) : tier.price_display

                  return (
                    <RevealItem key={tier.id} className={cn(popular && "lg:-mt-3")}>
                      <div className={cn("relative flex h-full rounded-2xl", popular && "lg:z-10")}>
                        {popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-brand text-white text-[10px] font-mono font-semibold uppercase tracking-[0.14em] whitespace-nowrap shadow-[0_0_16px_oklch(0.585_0.222_277/0.55)]">
                            Most Popular
                          </div>
                        )}

                        <div
                          className={cn(
                            "relative flex flex-col w-full rounded-2xl p-6",
                            popular
                              ? "border-gradient shadow-[0_40px_90px_-40px_oklch(0.585_0.222_277/0.55)]"
                              : "card-premium card-premium-hover"
                          )}
                        >
                          {popular && (
                            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                              <span className="absolute inset-0 bg-[linear-gradient(to_bottom,oklch(1_0_0_/_0.055),transparent_45%)]" />
                              <span className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-64 rounded-full bg-brand/20 blur-[60px]" />
                            </span>
                          )}

                          <div className="relative flex items-center gap-3 mb-5">
                            <div className={cn(
                              "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.08)]",
                              extras.chip
                            )}>
                              <Icon className={cn("h-[18px] w-[18px]", extras.accent)} />
                            </div>
                            <span className="text-lg font-semibold tracking-tight">{tier.label}</span>
                          </div>

                          <div className="relative flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-[2.5rem] leading-[0.9] font-semibold tracking-[-0.05em] tabular-nums text-gradient-subtle">
                              {price}
                            </span>
                            {!isFree && (
                              <span className="text-sm text-muted-foreground/70">
                                {yearly ? "/year" : "/month"}
                              </span>
                            )}
                          </div>

                          <div className="relative mt-6 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-white/[0.02] divide-x divide-white/[0.06] overflow-hidden">
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Credits</p>
                              <p className="mt-1.5 text-lg font-semibold tabular-nums leading-none">
                                {tier.credits_per_month.toLocaleString()}
                                <span className="text-[11px] font-normal text-muted-foreground/60 ml-1">/mo</span>
                              </p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Ideas</p>
                              <p className="mt-1.5 text-lg font-semibold tabular-nums leading-none">
                                {tier.max_ideas.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <ul className="relative mt-6 mb-7 space-y-3 flex-1">
                            {[tier.analyses_display, ...extras.perks].map((f, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/85 leading-relaxed">
                                <span className={cn(
                                  "mt-[1px] h-[18px] w-[18px] rounded-md flex items-center justify-center shrink-0 border",
                                  popular ? "bg-brand/15 border-brand/25" : "bg-success/10 border-success/20"
                                )}>
                                  <Check className={cn("h-3 w-3", popular ? "text-brand-cyan" : "text-success")} />
                                </span>
                                {f}
                              </li>
                            ))}
                          </ul>

                          <Button
                            asChild
                            className={cn(
                              "relative w-full h-11 rounded-xl text-sm font-semibold gap-2",
                              popular
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shimmer press"
                                : "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-foreground press"
                            )}
                            variant={popular ? "default" : "outline"}
                          >
                            <Link href="/register">
                              {isFree ? "Start free" : `Get ${tier.label}`}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </RevealItem>
                  )
                })}
              </RevealGroup>
            )}

            <p className="text-center text-xs text-muted-foreground/60 mt-9 max-w-lg mx-auto leading-relaxed flex items-center justify-center gap-2 flex-wrap">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              No credit card to start · Cancel anytime · 7-day refund policy
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="py-20 px-4 relative overflow-hidden">
          <Aurora intensity="subtle" grid={false} />
          <div className="container max-w-3xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <Reveal><p className="eyebrow mb-4">Questions</p></Reveal>
              <Reveal delay={0.08}>
                <h2 className="text-gradient-subtle">
                  Before you <span className="accent-serif text-gradient">decide</span>
                </h2>
              </Reveal>
            </div>

            <RevealGroup className="space-y-3">
              {FAQ.map((item) => (
                <RevealItem key={item.q}>
                  <div className="card-premium rounded-2xl p-6">
                    <h3 className="text-[15px] font-semibold mb-2">{item.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="pb-24 px-4">
          <Reveal className="container max-w-4xl mx-auto">
            <div className="relative rounded-3xl border-gradient text-center px-6 py-16 md:py-20 overflow-hidden">
              <Aurora grid={false} />
              <div className="relative z-10">
                <p className="eyebrow mb-5">Start now — it&apos;s free</p>
                <h2 className="mb-4 text-gradient-subtle">
                  Validate before you <span className="accent-serif text-gradient">build</span>
                </h2>
                <p className="text-muted-foreground mb-9 max-w-md mx-auto">
                  Run your first full analysis in three minutes. No card required.
                </p>
                <Button
                  size="lg"
                  className="h-13 px-10 text-base rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press w-full sm:w-auto"
                  asChild
                >
                  <Link href="/register">
                    <Sparkles className="h-4 w-4" />
                    Analyze Your Idea Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  )
}
