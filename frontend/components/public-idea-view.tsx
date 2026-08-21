"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Sparkles, Search, Target, CreditCard, Zap, Rocket,
  Briefcase, CheckCircle2, AlertCircle, TrendingUp, ThumbsUp,
  Globe, ArrowRight
} from "lucide-react"
import { IdeaComments } from "@/components/idea-comments"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Aurora, SpotlightCard } from "@/components/fx"
import Link from "next/link"

interface PublicIdeaViewProps {
  idea: any
}

/* ── Presentation helpers ────────────────────────────────── */

function scoreBadgeClass(score: number) {
  if (score >= 70) return "bg-success/10 text-success border-success/25"
  if (score >= 40) return "bg-warning/10 text-warning border-warning/25"
  return "bg-danger/10 text-danger border-danger/25"
}

function ScoreRing({ score }: { score: number }) {
  const R = 30
  const C = 2 * Math.PI * R
  const clamped = Math.max(0, Math.min(score, 100))
  return (
    <div className="relative h-20 w-20 shrink-0" aria-hidden>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={R} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          stroke="url(#publicScoreGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (C * clamped) / 100}
        />
        <defs>
          <linearGradient id="publicScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.75 0.13 215)" />
            <stop offset="55%" stopColor="oklch(0.585 0.222 277)" />
            <stop offset="100%" stopColor="oklch(0.64 0.24 305)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">
        {clamped}
      </div>
    </div>
  )
}

function MonoLabel({
  icon: Icon,
  children,
}: {
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
      {Icon && <Icon className="h-4 w-4 text-brand-cyan" />}
      {children}
    </p>
  )
}

function CardHeaderRow({
  icon: Icon,
  tone = "brand",
  children,
}: {
  icon: React.ElementType
  tone?: "brand" | "success" | "warning"
  children: React.ReactNode
}) {
  const chip =
    tone === "success"
      ? "from-success/25 to-success/10 border-success/25"
      : tone === "warning"
        ? "from-warning/25 to-warning/10 border-warning/25"
        : "from-brand/25 to-brand-violet/15 border-brand/20"
  const iconColor =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-brand-cyan"
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
      <div
        className={`w-9 h-9 rounded-lg bg-gradient-to-br ${chip} border flex items-center justify-center shrink-0`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h3 className="font-semibold tracking-tight">{children}</h3>
    </div>
  )
}

/* ── View ────────────────────────────────────────────────── */

export function PublicIdeaView({ idea }: PublicIdeaViewProps) {
  const [activeTab, setActiveTab] = useState("validation")

  const analysis = idea.analysis_data || {}
  const market = analysis.market_research || analysis.market || {}
  const competitors = analysis.competitors || []
  const monetization = analysis.monetization || {}
  const mvp = analysis.mvp_blueprint || analysis.mvp || {}
  const gtm = analysis.gtm_strategy || analysis.gtm || {}
  const investor = analysis.investor_pitches || analysis.investor || {}
  const researchHub = analysis.research_hub || analysis.execution_checklist || {}
  const competitorWatch = analysis.competitor_watch || competitors

  const overallScore = analysis.overall_score || 0

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-grow">
        {/* ── Report header ─────────────────────────────── */}
        <section className="relative pt-32 pb-10 md:pt-36 md:pb-12 overflow-hidden">
          <Aurora intensity="subtle" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-5 max-w-3xl animate-fade-up">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-brand-cyan">
                    {idea.is_public ? "Public Analysis" : "Private Shared Analysis"}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
                    Validated {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-balance text-gradient-subtle">{idea.title}</h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  {idea.description}
                </p>
              </div>

              <div className="card-premium rounded-2xl p-6 flex items-center gap-6 shrink-0 self-start lg:self-end animate-fade-up">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5">
                    Validity Score
                  </p>
                  <p className="text-5xl font-bold tabular-nums tracking-tight text-gradient">
                    {overallScore}%
                  </p>
                  <span
                    className={`mt-2.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${scoreBadgeClass(overallScore)}`}
                  >
                    {overallScore >= 70 ? "Strong" : overallScore >= 40 ? "Moderate" : "Weak"}
                  </span>
                </div>
                <ScoreRing score={overallScore} />
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 pb-12 space-y-10">
          {/* ── Content tabs ────────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-10">
            <div className="border-b border-white/[0.06] overflow-x-auto scrollbar-thin">
              <TabsList className="h-12 w-max min-w-full justify-center rounded-none bg-transparent p-0 gap-1 md:gap-2">
                {[
                  { id: "validation", label: "Validation", icon: Sparkles },
                  { id: "market", label: "Market", icon: Search },
                  { id: "competitors", label: "Competitors", icon: Target },
                  { id: "monetization", label: "Monetization", icon: CreditCard },
                  { id: "mvp", label: "MVP Blueprint", icon: Zap },
                  { id: "gtm", label: "GTM Strategy", icon: Rocket },
                  { id: "investor", label: "Investor", icon: Briefcase },
                  { id: "research", label: "Research", icon: Globe },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-3.5 text-xs font-medium tracking-wide text-muted-foreground whitespace-nowrap gap-1.5 shadow-none transition-colors hover:text-foreground/80 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="min-h-[500px]">
              {/* Validation Tab */}
              <TabsContent value="validation" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="card-premium rounded-2xl p-5">
                    <MonoLabel icon={ThumbsUp}>Market Demand</MonoLabel>
                    <div className="text-2xl font-bold tracking-tight mt-3">
                      {analysis.scores?.market_demand?.label || "Good"}
                    </div>
                    <Progress value={analysis.scores?.market_demand?.value || 70} className="h-2 mt-4" />
                  </div>
                  <div className="card-premium rounded-2xl p-5">
                    <MonoLabel icon={Target}>Severity</MonoLabel>
                    <div className="text-2xl font-bold tracking-tight mt-3">
                      {analysis.scores?.problem_severity?.label || "Moderate"}
                    </div>
                    <Progress value={analysis.scores?.problem_severity?.value || 50} className="h-2 mt-4" />
                  </div>
                  <div className="card-premium rounded-2xl p-5">
                    <MonoLabel icon={TrendingUp}>Potential</MonoLabel>
                    <div className="text-2xl font-bold tracking-tight mt-3">
                      {analysis.scores?.growth_potential?.label || "High"}
                    </div>
                    <Progress value={analysis.scores?.growth_potential?.value || 85} className="h-2 mt-4" />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="card-premium rounded-2xl overflow-hidden">
                    <CardHeaderRow icon={CheckCircle2} tone="success">Key Strengths</CardHeaderRow>
                    <div className="p-6 space-y-4">
                      {(analysis.strengths || ["Strong initial niche", "Scalable business model", "Low customer acquisition cost"]).map((item: string, i: number) => (
                        <div key={i} className="flex gap-3.5 text-sm leading-relaxed text-foreground/85">
                          <span className="h-6 w-6 rounded-full bg-success/10 border border-success/25 text-success flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-mono font-semibold tabular-nums">
                            {i + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-premium rounded-2xl overflow-hidden">
                    <CardHeaderRow icon={AlertCircle} tone="warning">Risks</CardHeaderRow>
                    <div className="p-6 space-y-4">
                      {(analysis.risks || ["Market saturation", "Regulatory hurdles", "Competition for talent"]).map((item: string, i: number) => (
                        <div key={i} className="flex gap-3.5 text-sm leading-relaxed text-foreground/85">
                          <span className="h-6 w-6 rounded-full bg-warning/10 border border-warning/25 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertCircle className="h-3.5 w-3.5 text-warning" />
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative rounded-3xl border-gradient overflow-hidden p-7 md:p-10">
                  <Aurora intensity="subtle" grid={false} />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5 text-brand-cyan" />
                      </div>
                      <h3 className="text-xl font-semibold tracking-tight">Strategy Recommendation</h3>
                    </div>
                    <p className="text-lg leading-relaxed text-foreground/85">
                      {analysis.recommendation || "Detailed AI strategy analysis will appear here."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Market Tab */}
              <TabsContent value="market" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-4 md:grid-cols-3">
                  {["tam", "sam", "som"].map((key) => (
                    <div key={key} className="card-premium rounded-2xl p-5">
                      <MonoLabel>{key.toUpperCase()}</MonoLabel>
                      <div className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-gradient-subtle mt-2.5">
                        {market[key] || "N/A"}
                      </div>
                      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/60 mt-2.5">
                        {key === 'tam' ? 'Total Market' : key === 'sam' ? 'Serviceable Market' : 'Obtainable Market'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="card-premium rounded-2xl overflow-hidden">
                    <CardHeaderRow icon={Globe}>Market Trends</CardHeaderRow>
                    <div className="p-6 space-y-6">
                      {(market.trends || []).map((trend: any, i: number) => (
                        <div key={i} className="space-y-1.5">
                          <h3 className="font-semibold text-base tracking-tight">{trend.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{trend.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-premium rounded-2xl overflow-hidden">
                    <CardHeaderRow icon={TrendingUp}>Competencies</CardHeaderRow>
                    <div className="p-6 space-y-3">
                      {(analysis.core_competencies || ["AI Analysis", "Speed", "Data"]).map((item: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium"
                        >
                          <span className="h-8 w-8 rounded-lg bg-brand/15 border border-brand/25 text-brand-cyan flex items-center justify-center shrink-0 text-xs font-mono font-semibold tabular-nums">
                            {i + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Competitors Tab */}
              <TabsContent value="competitors" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(competitors.length > 0 ? competitors : [
                    { name: "Competitor Alpha", description: "Direct competitor.", strengths: ["Brand"], weaknesses: ["Pricing"] },
                    { name: "Competitor Beta", description: "Modern startup.", strengths: ["Tech"], weaknesses: ["Market"] }
                  ]).map((comp: any, i: number) => (
                    <SpotlightCard key={i} className="p-6 h-full card-premium-hover">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-4">
                        <Target className="h-4.5 w-4.5 text-brand-cyan" />
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight mb-2">{comp.name}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{comp.description}</p>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">Strengths</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(comp.strengths || []).map((s: string, j: number) => (
                              <span key={j} className="rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">Weaknesses</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(comp.weaknesses || []).map((w: string, j: number) => (
                              <span key={j} className="rounded-full border border-danger/20 bg-danger/10 px-2.5 py-0.5 text-[11px] font-medium text-danger">
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  ))}
                </div>
              </TabsContent>

              {/* Monetization Tab */}
              <TabsContent value="monetization" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="card-premium rounded-2xl overflow-hidden">
                  <CardHeaderRow icon={CreditCard}>Revenue Streams</CardHeaderRow>
                  <div className="p-6 md:p-8 grid gap-4 md:grid-cols-2">
                    {(monetization.streams || analysis.revenue_streams || ["Subscription", "Exterprise", "API"]).map((stream: any, i: number) => (
                      <div
                        key={i}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-4 transition-colors hover:border-brand/25 hover:bg-brand/[0.04]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
                          <CreditCard className="h-4.5 w-4.5 text-brand-cyan" />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <h3 className="font-semibold tracking-tight">
                            {typeof stream === 'string' ? stream : stream.name}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {typeof stream === 'string' ? "Primary revenue channel driving consistent growth." : stream.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* MVP Tab */}
              <TabsContent value="mvp" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 card-premium rounded-2xl overflow-hidden">
                    <CardHeaderRow icon={Zap}>MVP Core Features</CardHeaderRow>
                    <div className="p-6 space-y-4">
                      {(mvp.features || analysis.mvp_features || ["Core V1", "Dashboard", "Alerts"]).map((feature: any, i: number) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <span className="h-8 w-8 rounded-lg bg-brand/15 border border-brand/25 text-brand-cyan flex items-center justify-center shrink-0 text-xs font-mono font-semibold tabular-nums">
                            {i + 1}
                          </span>
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-semibold tracking-tight">
                              {typeof feature === 'string' ? feature : feature.title}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {typeof feature === 'string' ? "Essential component for the initial product launch." : feature.impact}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative rounded-2xl border-gradient overflow-hidden p-6">
                    <div className="relative z-10">
                      <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70 mb-5">
                        MVP Goals
                      </p>
                      <p className="accent-serif text-xl md:text-2xl leading-snug text-foreground/90 mb-6">
                        &ldquo;Build a working prototype that solves the primary pain point.&rdquo;
                      </p>
                      <div className="space-y-3 pt-5 border-t border-white/[0.08]">
                        {["3 Month Delivery", "Low Dev Cost", "PMF Signal"].map((goal, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> {goal}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* GTM Tab */}
              <TabsContent value="gtm" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-4 md:grid-cols-2">
                  {(gtm.channels || analysis.gtm_channels || ["LinkedIn", "Content", "Forums"]).map((channel: any, i: number) => (
                    <SpotlightCard key={i} className="p-6 h-full card-premium-hover">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
                          <Rocket className="h-4.5 w-4.5 text-brand-cyan" />
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight">
                          {typeof channel === 'string' ? channel : channel.name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {typeof channel === 'string' ? "Optimized acquisition strategy to scale user base efficiently." : channel.strategy}
                      </p>
                    </SpotlightCard>
                  ))}
                </div>
              </TabsContent>

              {/* Investor Tab */}
              <TabsContent value="investor" className="space-y-8 animate-in fade-in duration-500 outline-none">
                <div className="relative rounded-3xl border-gradient overflow-hidden">
                  <Aurora intensity="subtle" grid={false} />
                  <div className="relative z-10 p-8 md:p-14 text-center space-y-8 max-w-2xl mx-auto">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center glow-primary">
                      <Briefcase className="h-7 w-7 text-brand-cyan" />
                    </div>
                    <div className="space-y-5">
                      <p className="eyebrow">Investor Pitch</p>
                      <h2 className="text-gradient-subtle text-balance">{idea.title} Elevator Pitch</h2>
                      <p className="accent-serif text-xl md:text-2xl text-foreground/85 leading-snug">
                        &ldquo;{investor.pitch_deck_intro || "A revolutionary approach to solving market fragmentation."}&rdquo;
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="card-premium rounded-2xl p-5 text-center">
                        <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70 mb-2">Target Raise</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-gradient-subtle">$500K - $1M</p>
                      </div>
                      <div className="card-premium rounded-2xl p-5 text-center">
                        <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70 mb-2">Valuation Cap</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-gradient-subtle">$5M - $8M</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Research Hub Tab */}
              <TabsContent value="research" className="space-y-6 animate-in fade-in duration-500 outline-none">
                {researchHub && typeof researchHub === 'object' && Object.keys(researchHub).length > 0 ? (
                  <div className="space-y-6">
                    {/* Execution Checklist */}
                    {Array.isArray(researchHub) ? (
                      <div className="card-premium rounded-2xl overflow-hidden">
                        <CardHeaderRow icon={CheckCircle2}>Execution Checklist</CardHeaderRow>
                        <div className="p-6 space-y-3">
                          {researchHub.map((item: any, i: number) => {
                            // Handle checklist items with step/description/phase
                            if (typeof item === 'object' && item !== null) {
                              const step = item.step || item.title || item.name || item.task || ''
                              const description = item.description || item.content || item.summary || ''
                              const phase = item.phase || ''
                              return (
                                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                                  {phase && (
                                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-cyan">{phase}</span>
                                  )}
                                  {step && <p className="text-sm font-semibold text-foreground">{step}</p>}
                                  {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
                                  {!step && !description && (
                                    <p className="text-sm text-foreground/85">
                                      {Object.values(item).filter(v => typeof v === 'string').join(' — ')}
                                    </p>
                                  )}
                                </div>
                              )
                            }
                            return (
                              <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <p className="text-sm text-foreground/85">{String(item)}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      // Object-based hub data (research_links, execution_checklist, etc.)
                      Object.entries(researchHub).map(([key, value]: [string, any], i: number) => (
                        <div key={i} className="card-premium rounded-2xl overflow-hidden">
                          <CardHeaderRow icon={Globe}>
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          </CardHeaderRow>
                          <div className="p-6 space-y-3">
                            {typeof value === 'string' ? (
                              <p className="text-sm text-foreground/85 leading-relaxed">{value}</p>
                            ) : Array.isArray(value) ? (
                              value.map((v: any, j: number) => {
                                if (typeof v === 'string') {
                                  return (
                                    <div key={j} className="flex gap-2.5 text-sm text-foreground/85">
                                      <span aria-hidden className="mt-[7px] h-1 w-1 rounded-full bg-brand/70 shrink-0" />
                                      <span>{v}</span>
                                    </div>
                                  )
                                }
                                if (typeof v === 'object' && v !== null) {
                                  const title = v.step || v.title || v.name || v.task || ''
                                  const desc = v.description || v.content || v.relevance || v.use_case || v.summary || ''
                                  const phase = v.phase || v.category || v.type || ''
                                  return (
                                    <div key={j} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                                      {phase && (
                                        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-cyan">{phase}</span>
                                      )}
                                      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
                                      {desc && <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>}
                                      {!title && !desc && (
                                        <p className="text-sm text-foreground/85">
                                          {Object.values(v).filter((val: any) => typeof val === 'string').join(' — ')}
                                        </p>
                                      )}
                                    </div>
                                  )
                                }
                                return (
                                  <div key={j} className="flex gap-2.5 text-sm text-foreground/85">
                                    <span aria-hidden className="mt-[7px] h-1 w-1 rounded-full bg-brand/70 shrink-0" />
                                    <span>{String(v)}</span>
                                  </div>
                                )
                              })
                            ) : typeof value === 'object' && value !== null ? (
                              <div className="space-y-1.5">
                                {Object.entries(value).map(([k2, v2]: [string, any], j: number) => (
                                  <p key={j} className="text-sm text-foreground/85">
                                    <span className="font-semibold text-foreground capitalize">{k2.replace(/_/g, ' ')}:</span> {String(v2)}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-foreground/85">{String(value)}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="card-premium rounded-2xl py-16 text-center">
                    <p className="text-muted-foreground text-sm accent-serif text-lg">
                      Research hub data will appear after full analysis.
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* ── Comments ────────────────────────────────── */}
          <div className="pt-16 pb-28 mt-10 hairline-t">
            <div className="max-w-4xl mx-auto">
              <IdeaComments shareToken={idea.share_token} />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ── Bottom CTA ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 py-3.5 px-4 md:px-6 z-50">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-foreground">Want to validate your startup idea?</p>
            <p className="text-xs text-muted-foreground">Get AI-powered analysis, market research, and competitor intelligence — free.</p>
          </div>
          <Link
            href="/dashboard/new-idea"
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors glow-primary shimmer press"
          >
            Validate your own idea free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
