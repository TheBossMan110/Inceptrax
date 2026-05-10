"use client"

import Link from "next/link"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ArrowRight, BarChart3, Users, Rocket, CheckCircle2 } from "lucide-react"
import { useScrollReveal } from "@/hooks/useScrollReveal"

const features = [
  { icon: "🔍", title: "Idea Validation",       desc: "Score your idea across 6 dimensions with real market data and AI-driven analysis." },
  { icon: "📊", title: "Market Research",        desc: "Live TAM, SAM, SOM data with CAGR and trend analysis sourced from the web." },
  { icon: "🆚", title: "Competitor Analysis",    desc: "Real competitor names, weaknesses, and market gaps you can exploit." },
  { icon: "💰", title: "Monetization Strategy",  desc: "Revenue models, pricing tiers, and LTV:CAC benchmarks tailored to your idea." },
  { icon: "🛠️", title: "MVP Blueprint",          desc: "Feature roadmap, tech stack recommendations, and budget breakdown." },
  { icon: "🚀", title: "Go-To-Market",           desc: "Launch channels, 90-day action plan, and customer acquisition targets." },
]

const steps = [
  { num: "01", title: "Describe your idea",       desc: "Type your startup concept in plain language. No forms, no complexity." },
  { num: "02", title: "AI analyzes in real-time", desc: "8 sequential AI stages run with live web research for accurate, current data." },
  { num: "03", title: "Get your full report",     desc: "Scores, insights, investor pitches, and a 90-day action plan — in minutes." },
]

const stats = [
  { value: "2,400+", label: "Ideas validated" },
  { value: "87%",    label: "Avg accuracy score" },
  { value: "8",      label: "Analysis stages" },
  { value: "3 min",  label: "Average analysis time" },
]

const testimonials = [
  {
    quote: "Inceptrax saved me 6 months of dev time. It correctly identified a saturated market I was about to enter and suggested a pivot that got us funded.",
    name: "Sarah J.", role: "Founder, TechFlow", initials: "SJ",
  },
  {
    quote: "The MVP blueprint feature is insane. It prioritized my features better than my actual product manager. Essential for indie hackers.",
    name: "David K.", role: "Indie Hacker", initials: "DK",
  },
]

// JSON-LD Structured Data for SEO
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

export default function LandingPage() {
  const heroRef     = useScrollReveal(0.06)
  const statsRef    = useScrollReveal(0.06)
  const featuresRef = useScrollReveal(0.07)
  const stepsRef    = useScrollReveal(0.08)
  const socialRef   = useScrollReveal(0.08)

  return (
    <div className="flex flex-col min-h-screen">
      {/* JSON-LD Structured Data */}
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div ref={heroRef} className="container px-4 text-center relative z-10 max-w-5xl mx-auto">
            <div data-reveal className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              AI-powered startup analysis · 8 deep stages
            </div>

            <h1 data-reveal className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight text-balance mb-6">
              Validate your startup idea{" "}
              <span className="underline underline-offset-4 decoration-foreground/30">before you build</span>
            </h1>

            <p data-reveal className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
              AI-powered analysis across 8 stages — market research, competitors,
              monetization, MVP planning, and more. In minutes, not months.
            </p>

            <div data-reveal className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              <Button size="lg" className="h-12 px-8 text-base gap-2 w-full sm:w-auto" asChild>
                <Link href="/register">
                  Analyze Your Idea Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto" asChild>
                <Link href="/features">See Example Report</Link>
              </Button>
            </div>

            <p data-reveal className="text-xs text-muted-foreground mt-4">
              No credit card required · Takes 3 minutes · 2,400+ ideas validated
            </p>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────── */}
        <section className="py-16 border-y border-border">
          <div ref={statsRef} className="container px-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} data-reveal className="flex flex-col items-center text-center p-4 rounded-xl border bg-card">
                  <span className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">{stat.value}</span>
                  <span className="text-xs text-muted-foreground mt-1.5 font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="py-24" id="features">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">What you get</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to validate fast</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">8 sequential AI stages built for founders who move fast and need accurate data — not opinions.</p>
            </div>
            <div ref={featuresRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div key={f.title} data-reveal className="rounded-xl border bg-card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform duration-200">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────── */}
        <section className="py-24 bg-muted/30 border-y border-border" id="how-it-works">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Simple process</p>
              <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
            </div>
            <div ref={stepsRef} className="grid md:grid-cols-3 gap-10 relative">
              <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-border" />
              {steps.map((step) => (
                <div key={step.num} data-reveal className="relative flex flex-col items-center text-center gap-4">
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-background border-2 border-border flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-2xl font-bold text-foreground/50 font-mono">{step.num}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────── */}
        <section className="py-24">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Real founders</p>
              <h2 className="text-3xl font-bold">Trusted by 5,000+ modern founders</h2>
              <p className="text-muted-foreground mt-3">$40M+ in potential wasted development hours saved this year.</p>
            </div>
            <div ref={socialRef} className="grid md:grid-cols-2 gap-6">
              {testimonials.map((t) => (
                <div key={t.name} data-reveal className="rounded-xl border bg-card p-6">
                  <p className="text-foreground/80 text-base leading-relaxed italic mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-sm">{t.initials}</div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section className="py-24 border-t border-border">
          <div className="container px-4 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to validate your idea?</h2>
            <p className="text-muted-foreground mb-10 text-lg max-w-md mx-auto">Stop guessing. Start building the right thing.</p>
            <Button size="lg" className="h-12 px-10 text-base w-full sm:w-auto" asChild>
              <Link href="/register">Start Free Analysis →</Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-4">No credit card · Free to start · 3 minutes to insights</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
