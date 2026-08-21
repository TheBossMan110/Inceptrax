"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Lightbulb, TrendingUp, BarChart3, ArrowRight, Plus, Sparkles,
  ExternalLink, Loader2, AlertTriangle, RotateCcw, CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { usePageTransition } from "@/hooks/usePageTransition"
import { toast } from "sonner"

interface Stat { name: string; value: string; icon: any; change: string }
interface Idea { id: number; title: string; created_at: string; overall_score: number; status: string }

const iconMap: Record<string, any> = { Lightbulb, TrendingUp, BarChart3 }

function getScoreBadge(score: number) {
  if (score >= 75) return "bg-success/10 text-success border border-success/25"
  if (score >= 50) return "bg-warning/10 text-warning border border-warning/25"
  return "bg-danger/10 text-danger border border-danger/25"
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
}

const RESOURCE_TIPS = [
  "Validate your idea early with real user feedback",
  "Use data-driven GTM strategies to find your audience",
  "Monitor KPIs weekly to stay on your growth trajectory",
]

/** Loading placeholder matching the final stat tile geometry. */
function StatTileSkeleton() {
  return (
    <div className="card-premium rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="skeleton h-3 w-24 mt-1" />
        <div className="skeleton h-10 w-10 rounded-xl" />
      </div>
      <div className="skeleton h-9 w-20 mt-5" />
      <div className="mt-4 pt-4 border-t border-white/[0.05]">
        <div className="skeleton h-3 w-28" />
      </div>
    </div>
  )
}

/** Loading placeholder matching a recent-idea row. */
function IdeaRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="skeleton h-10 w-10 rounded-xl shrink-0" />
        <div className="space-y-2 min-w-0 flex-1">
          <div className="skeleton h-4 w-2/5" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
      <div className="skeleton h-6 w-14 rounded-full shrink-0" />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const pageRef = usePageTransition()
  const [stats, setStats] = useState<Stat[]>([])
  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<number | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsData, ideasData] = await Promise.all([
        apiFetch("/users/stats"),
        apiFetch("/ideas/"),
      ])
      setStats(statsData.data.stats.map((s: any) => ({ ...s, icon: iconMap[s.icon] || Lightbulb })))
      setRecentIdeas(ideasData.data.ideas.slice(0, 4))
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Auto-refresh when any idea is still processing
  useEffect(() => {
    const hasProcessing = recentIdeas.some(i => i.status === "processing")
    if (!hasProcessing) return

    const interval = setInterval(async () => {
      try {
        const ideasData = await apiFetch("/ideas/")
        setRecentIdeas(ideasData.data.ideas.slice(0, 4))
      } catch { /* silent */ }
    }, 5000)

    return () => clearInterval(interval)
  }, [recentIdeas])

  const handleRetry = async (ideaId: number) => {
    setRetryingId(ideaId)
    try {
      await apiFetch(`/ideas/${ideaId}/reanalyze`, { method: "POST" })
      toast.success("Re-analysis started! Redirecting to progress tracker…")
      setRecentIdeas(prev =>
        prev.map(i => i.id === ideaId ? { ...i, status: "processing" } : i)
      )
      setTimeout(() => {
        router.push(`/dashboard/idea/${ideaId}/progress`)
      }, 500)
    } catch (err: any) {
      toast.error(err.message || "Failed to retry analysis")
    } finally {
      setRetryingId(null)
    }
  }

  const getIdeaHref = (idea: Idea) => {
    if (idea.status === "processing") return `/dashboard/idea/${idea.id}/progress`
    return `/dashboard/idea/${idea.id}/validation`
  }

  return (
    <div ref={pageRef} className="space-y-8 sm:space-y-10 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pt-1">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Overview</p>
          <h1 className="text-[1.75rem] sm:text-4xl font-semibold tracking-[-0.03em] leading-[1.08] text-gradient-subtle">
            Welcome back,{" "}
            <span className="accent-serif text-gradient">{user?.first_name || "Founder"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2.5 max-w-md leading-relaxed">
            Here&apos;s an overview of your ideas and progress.
          </p>
        </div>
        <Button
          asChild
          className="gap-2 shrink-0 w-full sm:w-auto h-11 px-5 rounded-xl font-semibold bg-primary hover:bg-primary/90 glow-primary shimmer press"
        >
          <Link href="/dashboard/new-idea">
            <Plus className="h-4 w-4" /> New Idea
          </Link>
        </Button>
      </header>

      {/* ── Stat tiles ─────────────────────────────────────────── */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatTileSkeleton key={i} />)
          : stats.map((stat) => (
              <motion.div
                key={stat.name}
                variants={itemVariants}
                className="group relative overflow-hidden rounded-2xl card-premium card-premium-hover p-5 sm:p-6"
              >
                {/* Corner bloom on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-14 -right-10 h-32 w-32 rounded-full bg-brand/[0.16] blur-[46px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />

                <div className="relative flex items-start justify-between gap-3">
                  <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/70 pt-1.5 leading-relaxed">
                    {stat.name}
                  </p>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]">
                    <stat.icon className="h-4 w-4 text-brand-cyan" />
                  </div>
                </div>

                <div className="relative mt-4 text-[2.5rem] leading-none font-semibold tabular-nums tracking-[-0.035em] text-gradient-subtle">
                  {stat.value}
                </div>

                <div className="relative mt-4 pt-4 border-t border-white/[0.05]">
                  <p className="text-xs text-muted-foreground leading-relaxed">{stat.change}</p>
                </div>
              </motion.div>
            ))}
      </motion.div>

      {/* ── Main grid ──────────────────────────────────────────── */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        {/* Recent ideas */}
        <section className="lg:col-span-2 card-premium rounded-2xl overflow-hidden shadow-[0_30px_70px_-40px_oklch(0_0_0_/_0.85)]">
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 pt-5 pb-4">
            <div className="min-w-0">
              <p className="eyebrow mb-1.5">Recent</p>
              <h2 className="text-[15px] font-semibold tracking-tight">Your latest ideas</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] shrink-0"
            >
              <Link href="/dashboard/ideas">
                View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="divider-glow" />

          {isLoading ? (
            <div className="divide-y divide-white/[0.05]">
              {Array.from({ length: 3 }).map((_, i) => <IdeaRowSkeleton key={i} />)}
            </div>
          ) : recentIdeas.length > 0 ? (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-white/[0.05]"
            >
              {recentIdeas.map((idea) => {
                const isProcessing = idea.status === "processing"
                const isFailed = idea.status === "failed"
                const isRetrying = retryingId === idea.id

                return (
                  <motion.div
                    key={idea.id}
                    variants={itemVariants}
                    className={cn(
                      "group relative flex items-center justify-between gap-3 px-4 sm:px-6 py-4 transition-colors duration-200",
                      isFailed
                        ? "bg-danger/[0.04]"
                        : isProcessing
                        ? "bg-brand/[0.04]"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Hover rail */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-8 rounded-r-full transition-opacity duration-200",
                        isFailed
                          ? "bg-danger opacity-100"
                          : isProcessing
                          ? "bg-brand opacity-100"
                          : "bg-brand/70 opacity-0 group-hover:opacity-100"
                      )}
                    />

                    {/* Left: icon + text */}
                    <Link
                      href={getIdeaHref(idea)}
                      className="flex items-center gap-3.5 min-w-0 flex-1"
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]",
                        isFailed
                          ? "bg-danger/10 border-danger/25"
                          : isProcessing
                          ? "bg-brand/10 border-brand/25"
                          : "bg-white/[0.04] border-white/[0.07]"
                      )}>
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 text-brand animate-spin" />
                        ) : isFailed ? (
                          <AlertTriangle className="h-4 w-4 text-danger" />
                        ) : (
                          <Lightbulb className="h-4 w-4 text-brand-cyan/80" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-brand-cyan transition-colors duration-200">
                          {idea.title}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          {isProcessing
                            ? "AI analysis in progress…"
                            : isFailed
                            ? "Analysis failed — click retry to try again"
                            : new Date(idea.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </Link>

                    {/* Right: status + actions */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      {idea.status === "completed" && idea.overall_score > 0 && (
                        <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full tabular-nums", getScoreBadge(idea.overall_score))}>
                          {idea.overall_score}
                        </span>
                      )}

                      {isProcessing && (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-brand/10 text-brand-cyan border border-brand/25 animate-pulse-glow">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Processing
                        </span>
                      )}

                      {isFailed && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 rounded-lg text-xs font-semibold border-danger/30 text-danger hover:bg-danger/10 hover:text-danger press"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleRetry(idea.id)
                          }}
                          disabled={isRetrying}
                        >
                          {isRetrying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Retry
                        </Button>
                      )}

                      {idea.status === "completed" && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 capitalize">
                          <CheckCircle2 className="h-3 w-3" />
                          completed
                        </span>
                      )}

                      <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground/40 group-hover:text-brand-cyan group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            /* ── Empty state ── */
            <div className="relative flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" />

              <div className="relative">
                <div aria-hidden className="absolute -inset-5 rounded-[2rem] bg-brand/15 blur-2xl" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-brand/30 to-brand-violet/15 border border-brand/25 flex items-center justify-center shadow-[inset_0_1px_0_oklch(1_0_0_/_0.14)] animate-float">
                  <Sparkles className="h-7 w-7 text-brand-cyan" />
                </div>
              </div>

              <h3 className="relative mt-7 text-xl font-semibold tracking-tight text-gradient-subtle">
                Your first idea starts here
              </h3>
              <p className="relative mt-2.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
                Describe a concept in a sentence. Our AI refines it layer by layer, then
                returns a full validation report in minutes.
              </p>

              <Button
                asChild
                className="relative mt-6 h-11 px-5 gap-2 rounded-xl font-semibold bg-primary hover:bg-primary/90 glow-primary shimmer press"
              >
                <Link href="/dashboard/new-idea">
                  <Plus className="h-4 w-4" /> Analyze your first idea
                </Link>
              </Button>

              <div className="relative mt-7 flex flex-wrap items-center justify-center gap-2">
                {["8-stage analysis", "Market research", "Investor pitch"].map((chip) => (
                  <span
                    key={chip}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Resources panel */}
        <aside className="relative rounded-2xl border-gradient shadow-[0_30px_70px_-40px_oklch(0_0_0_/_0.85)]">
          <div className="glass-strong rounded-2xl h-full flex flex-col p-5 sm:p-6">
            <p className="eyebrow mb-2">Level up</p>
            <h2 className="text-[15px] font-semibold tracking-tight">Founder Resources</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
              Curated tips to accelerate your startup journey.
            </p>

            <ul className="mt-6 space-y-4 flex-1">
              {RESOURCE_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                  <span className="mt-0.5 h-5 w-5 rounded-md bg-success/10 border border-success/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  </span>
                  {tip}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full mt-6 h-10 gap-2 font-medium rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] press"
              onClick={() => window.open("https://www.ycombinator.com/library", "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" /> YC Library
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
