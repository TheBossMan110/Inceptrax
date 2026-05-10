"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StageSkeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle, TrendingUp, ThumbsUp, Target, ArrowRight, Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { gsap } from "@/lib/gsap"
import { useScrollReveal } from "@/hooks/useScrollReveal"
import { cn } from "@/lib/utils"

function getScoreColor(score: number) {
  if (score >= 75) return "text-green-600 dark:text-green-400"
  if (score >= 50) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function getScoreBadge(score: number) {
  if (score >= 75) return "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900"
  if (score >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
  return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900"
}

function getVerdictText(score: number): { text: string; colorClass: string } {
  if (score >= 75) return { text: "Ready to Launch 🚀", colorClass: "text-green-600 dark:text-green-400" }
  if (score >= 50) return { text: "Needs Refinement ⚡", colorClass: "text-amber-600 dark:text-amber-400" }
  return { text: "Back to Drawing Board 🔄", colorClass: "text-red-600 dark:text-red-400" }
}

export default function IdeaValidationPage() {
  const params = useParams()
  const [idea, setIdea] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [displayScore, setDisplayScore] = useState(0)
  const [showVerdict, setShowVerdict] = useState(false)
  const contentRef = useScrollReveal(0.08)

  useEffect(() => {
    async function fetchIdea() {
      try {
        const response = await apiFetch(`/ideas/${params.id}`)
        setIdea(response.data.idea)
      } catch (error) {
        console.error("Failed to fetch idea:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchIdea()
  }, [params.id])

  useEffect(() => {
    if (!idea?.analysis_data?.overall_score) return
    const finalScore = idea.analysis_data.overall_score
    const timer = setTimeout(() => {
      setShowVerdict(true)
      const obj = { val: 0 }
      gsap.to(obj, {
        val: finalScore,
        duration: 1.5,
        ease: "power2.out",
        onUpdate: function () { setDisplayScore(Math.round(obj.val)) },
      })
      if (finalScore >= 80) {
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ["#000000", "#ffffff", "#888888"] })
        })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [idea])

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-border border-t-foreground animate-spin" />
          <p className="text-muted-foreground text-sm">Compiling your startup blueprint…</p>
        </div>
        <StageSkeleton />
      </div>
    )
  }

  if (!idea || !idea.analysis_data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Analysis not found</h2>
        <p className="text-muted-foreground mt-2">We couldn&apos;t retrieve the validation report for this idea.</p>
      </div>
    )
  }

  const analysis = idea.analysis_data
  const finalScore = analysis.overall_score ?? 0
  const verdict = getVerdictText(finalScore)

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header + Score */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Badge variant="secondary">Validation Report</Badge>
            <span className="text-xs sm:text-sm text-muted-foreground">Generated {new Date(idea.created_at).toLocaleDateString()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{idea.title} Analysis</h1>
          <p className="text-muted-foreground mt-2 text-sm line-clamp-2 sm:line-clamp-none">{idea.pitch}</p>
        </div>

        <div className="bg-card border rounded-2xl p-5 flex flex-row sm:flex-col items-center justify-center gap-4 sm:gap-1 shrink-0 w-full sm:w-auto min-w-[140px] shadow-sm">
          <div className="flex flex-col items-center sm:items-center">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Overall Score</p>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-4xl sm:text-5xl font-bold tabular-nums tracking-tight transition-colors duration-500", getScoreColor(finalScore))}>
                {displayScore}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          {showVerdict && <span className={cn("text-xs font-semibold px-2 py-1 rounded-full bg-muted/50 sm:bg-transparent", verdict.colorClass)}>{verdict.text}</span>}
        </div>
      </div>

      {/* Sub-score cards */}
      <div ref={contentRef} className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Market Demand",    key: "market_demand",    icon: ThumbsUp },
          { label: "Problem Severity", key: "problem_severity", icon: Target },
          { label: "Growth Potential", key: "growth_potential", icon: TrendingUp },
        ].map(({ label, key, icon: Icon }) => {
          const score = analysis.scores?.[key]
          return (
            <div key={key} data-reveal className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
                {score?.value !== undefined && (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums", getScoreBadge(score.value))}>
                    {score.value}
                  </span>
                )}
              </div>
              <div className="text-lg font-semibold">{score?.label || "N/A"}</div>
              <Progress value={score?.value || 0} className="h-1.5" />
            </div>
          )
        })}
      </div>

      {/* Strengths & Risks */}
      <div className="grid gap-6 md:grid-cols-2">
        <div data-reveal className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-green-500" /> Key Strengths</h3>
          <div className="space-y-3">
            {(analysis.strengths || []).map((s: string, i: number) => (
              <div key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                <div className="h-5 w-5 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span>{s}</span>
              </div>
            ))}
            {!analysis.strengths?.length && <p className="text-sm text-muted-foreground">No strengths data available.</p>}
          </div>
        </div>

        <div data-reveal className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold"><AlertCircle className="h-5 w-5 text-amber-500" /> Risks & Challenges</h3>
          <div className="space-y-3">
            {(analysis.risks || []).map((r: string, i: number) => (
              <div key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="h-3 w-3" />
                </div>
                <span>{r}</span>
              </div>
            ))}
            {!analysis.risks?.length && <p className="text-sm text-muted-foreground">No risks data available.</p>}
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      {analysis.recommendation && (
        <div data-reveal className="rounded-xl border-l-4 border border-border border-l-foreground bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Recommendation</p>
          <p className="text-sm leading-relaxed text-foreground/90">{analysis.recommendation}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 pb-8">
        <Link href={`/dashboard/idea/${params.id}/improve`}>
          <Button variant="outline" className="gap-2" size="lg"><Sparkles className="h-4 w-4" /> Improve with AI</Button>
        </Link>
        <Link href={`/dashboard/idea/${params.id}/market`}>
          <Button className="gap-2 w-full sm:w-auto" size="lg">Next: Market Analysis <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  )
}
