"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { CheckCircle2, AlertCircle, TrendingUp, ThumbsUp, Target, ArrowRight, Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { gsap } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-success"
  if (score >= 50) return "text-warning"
  return "text-danger"
}

function getScoreBadge(score: number) {
  if (score >= 75) return "bg-success/10 text-success border border-success/25"
  if (score >= 50) return "bg-warning/10 text-warning border border-warning/25"
  return "bg-danger/10 text-danger border border-danger/25"
}

function getVerdictText(score: number): { text: string; colorClass: string } {
  if (score >= 75) return { text: "Ready to Launch", colorClass: "text-success" }
  if (score >= 50) return { text: "Needs Refinement", colorClass: "text-warning" }
  return { text: "Back to the Drawing Board", colorClass: "text-danger" }
}

/* Circular score ring — stroke gradient cyan → indigo → violet */
function ScoreRing({ score }: { score: number }) {
  const R = 44
  const C = 2 * Math.PI * R
  return (
    <div className="relative h-32 w-32 sm:h-36 sm:w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="url(#validationScoreGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - (C * Math.min(100, Math.max(0, score))) / 100}
        />
        <defs>
          <linearGradient id="validationScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.75 0.13 215)" />
            <stop offset="55%" stopColor="oklch(0.585 0.222 277)" />
            <stop offset="100%" stopColor="oklch(0.64 0.24 305)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums tracking-tight">{score}</span>
        <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

export default function IdeaValidationPage() {
  const params = useParams()
  const [idea, setIdea] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [displayScore, setDisplayScore] = useState(0)
  const [showVerdict, setShowVerdict] = useState(false)

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
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-full max-w-lg" />
          </div>
          <div className="skeleton h-44 w-full sm:w-48 rounded-2xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!idea || !idea.analysis_data) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <div className="card-premium rounded-2xl py-16 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
            <AlertCircle className="h-6 w-6 text-brand-cyan" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Analysis not found</h2>
          <p className="text-sm text-muted-foreground mt-2">We couldn&apos;t retrieve the validation report for this idea.</p>
        </div>
      </div>
    )
  }

  const analysis = idea.analysis_data
  const finalScore = analysis.overall_score ?? 0
  const verdict = getVerdictText(finalScore)

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
      {/* Header + Score */}
      <div className="flex flex-col sm:flex-row sm:items-stretch justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-brand-cyan">
              <Sparkles className="h-3 w-3" /> Validation Report
            </span>
            <span className="text-xs text-muted-foreground/70">
              Generated {new Date(idea.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle truncate">
            {idea.title} Analysis
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed line-clamp-2 sm:line-clamp-none">{idea.pitch}</p>
        </div>

        <div className="relative rounded-2xl border-gradient p-5 flex flex-row sm:flex-col items-center justify-center gap-4 sm:gap-2 shrink-0 w-full sm:w-auto sm:min-w-[190px]">
          <ScoreRing score={displayScore} />
          {showVerdict && (
            <span className={cn("text-xs font-semibold px-3 py-1 rounded-full glass", verdict.colorClass)}>
              {verdict.text}
            </span>
          )}
        </div>
      </div>

      {/* Sub-score cards */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Market Demand",    key: "market_demand",    icon: ThumbsUp },
          { label: "Problem Severity", key: "problem_severity", icon: Target },
          { label: "Growth Potential", key: "growth_potential", icon: TrendingUp },
        ].map(({ label, key, icon: Icon }) => {
          const score = analysis.scores?.[key]
          return (
            <motion.div key={key} variants={itemVariants} className="card-premium card-premium-hover rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-brand-cyan shrink-0" />
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70 truncate">{label}</p>
                </div>
                {score?.value !== undefined && (
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full tabular-nums shrink-0", getScoreBadge(score.value))}>
                    {score.value}
                  </span>
                )}
              </div>
              <div className="text-lg font-semibold tracking-tight">{score?.label || "N/A"}</div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
                  initial={{ width: 0 }}
                  animate={{ width: `${score?.value || 0}%` }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Strengths & Risks */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-premium rounded-2xl p-6 space-y-4">
          <h3 className="flex items-center gap-2.5 font-semibold text-base">
            <span className="w-8 h-8 rounded-lg bg-success/10 border border-success/25 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </span>
            Key Strengths
          </h3>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
            {(analysis.strengths || []).map((s: string, i: number) => (
              <motion.div key={i} variants={itemVariants} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                <div className="h-5 w-5 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span>{s}</span>
              </motion.div>
            ))}
            {!analysis.strengths?.length && <p className="text-sm text-muted-foreground">No strengths data available.</p>}
          </motion.div>
        </div>

        <div className="card-premium rounded-2xl p-6 space-y-4">
          <h3 className="flex items-center gap-2.5 font-semibold text-base">
            <span className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-warning" />
            </span>
            Risks &amp; Challenges
          </h3>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
            {(analysis.risks || []).map((r: string, i: number) => (
              <motion.div key={i} variants={itemVariants} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                <div className="h-5 w-5 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="h-3 w-3" />
                </div>
                <span>{r}</span>
              </motion.div>
            ))}
            {!analysis.risks?.length && <p className="text-sm text-muted-foreground">No risks data available.</p>}
          </motion.div>
        </div>
      </div>

      {/* AI Recommendation */}
      {analysis.recommendation && (
        <div className="relative rounded-2xl border-gradient p-6">
          <p className="eyebrow mb-2.5">AI Recommendation</p>
          <p className="text-sm leading-relaxed text-foreground/90">{analysis.recommendation}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 pb-8">
        <Link href={`/dashboard/idea/${params.id}/improve`} className="w-full sm:w-auto">
          <Button variant="outline" className="gap-2 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" size="lg">
            <Sparkles className="h-4 w-4 text-brand-cyan" /> Improve with AI
          </Button>
        </Link>
        <Link href={`/dashboard/idea/${params.id}/market`} className="w-full sm:w-auto">
          <Button className="gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press" size="lg">
            Next: Market Analysis <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
