"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCardSkeleton, IdeaCardSkeleton } from "@/components/ui/skeleton"
import {
  Lightbulb, TrendingUp, BarChart3, ArrowRight, Plus, Sparkles,
  ExternalLink, Loader2, AlertTriangle, RotateCcw
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { usePageTransition } from "@/hooks/usePageTransition"
import { toast } from "sonner"

interface Stat { name: string; value: string; icon: any; change: string }
interface Idea { id: number; title: string; created_at: string; overall_score: number; status: string }

const iconMap: Record<string, any> = { Lightbulb, TrendingUp, BarChart3 }

const STATUS_STYLES: Record<string, string> = {
  completed:  "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  processing: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  pending:    "bg-muted text-muted-foreground",
  failed:     "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
}

function getScoreBadge(score: number) {
  if (score >= 75) return "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900"
  if (score >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
  return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900"
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
      // Update the local state immediately
      setRecentIdeas(prev =>
        prev.map(i => i.id === ideaId ? { ...i, status: "processing" } : i)
      )
      // Navigate to the progress/stage tracker page
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
    <div ref={pageRef} className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.first_name || "Founder"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s an overview of your ideas and progress.
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0 w-full sm:w-auto">
          <Link href="/dashboard/new-idea">
            <Plus className="h-4 w-4" /> New Idea
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat) => (
              <div
                key={stat.name}
                className="rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-px"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-foreground/70" />
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.change}</p>
              </div>
            ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent ideas */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Recent Ideas</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Your latest startup concepts</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/dashboard/ideas">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-6 pb-6 space-y-3 pt-2">
                {Array.from({ length: 3 }).map((_, i) => <IdeaCardSkeleton key={i} />)}
              </div>
            ) : recentIdeas.length > 0 ? (
              <div className="divide-y divide-border">
                {recentIdeas.map((idea) => {
                  const isProcessing = idea.status === "processing"
                  const isFailed = idea.status === "failed"
                  const isRetrying = retryingId === idea.id

                  return (
                    <div
                      key={idea.id}
                      className={cn(
                        "group flex items-center justify-between px-4 sm:px-6 py-4 transition-colors duration-150",
                        isFailed
                          ? "bg-red-50/50 dark:bg-red-950/10"
                          : isProcessing
                          ? "bg-amber-50/30 dark:bg-amber-950/10"
                          : "hover:bg-muted/40"
                      )}
                    >
                      {/* Left: icon + text */}
                      <Link
                        href={getIdeaHref(idea)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                          isFailed
                            ? "bg-red-100 dark:bg-red-900/30"
                            : isProcessing
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-muted"
                        )}>
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
                          ) : isFailed ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Lightbulb className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{idea.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
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
                        {/* Score badge — only for completed */}
                        {idea.status === "completed" && idea.overall_score > 0 && (
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums", getScoreBadge(idea.overall_score))}>
                            {idea.overall_score}
                          </span>
                        )}

                        {/* Processing: animated badge */}
                        {isProcessing && (
                          <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing
                          </span>
                        )}

                        {/* Failed: retry button */}
                        {isFailed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 rounded-lg text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
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

                        {/* Status badge for completed */}
                        {idea.status === "completed" && (
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full capitalize", STATUS_STYLES.completed)}>
                            completed
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4 px-6">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">No ideas yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first idea and get an AI-powered analysis in minutes</p>
                </div>
                <Button asChild className="mt-1 gap-2">
                  <Link href="/dashboard/new-idea"><Plus className="h-4 w-4" /> Analyze your first idea →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources panel */}
        <Card className="bg-foreground text-background border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-background">Founder Resources</CardTitle>
            <p className="text-sm text-background/60 leading-relaxed">Curated tips to accelerate your startup journey.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-3">
              {[
                "Validate your idea early with real user feedback",
                "Use data-driven GTM strategies to find your audience",
                "Monitor KPIs weekly to stay on your growth trajectory",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-background/80">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-background/50 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="w-full gap-2 font-medium"
              onClick={() => window.open("https://www.ycombinator.com/library", "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" /> YC Library
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
