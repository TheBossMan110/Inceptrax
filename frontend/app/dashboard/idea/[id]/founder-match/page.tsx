"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  UserCheck, AlertTriangle, CheckCircle2, ArrowRight,
  Users, Target, RefreshCw,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

interface MatchData {
  match_score: number
  verdict: string
  strengths: string[]
  gaps: string[]
  recommended_cofounder: string
  advice: string
}

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

/* Animated circular score ring */
function MatchRing({ score }: { score: number }) {
  const R = 44
  const C = 2 * Math.PI * R
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="7" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="url(#matchScoreGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * Math.min(100, Math.max(0, score))) / 100 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <defs>
          <linearGradient id="matchScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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

export default function FounderMatchPage() {
  const params = useParams()
  const [data, setData] = useState<MatchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/ideas/${params.id}/founder-match`, { method: "POST" })
      setData(res.data)
    } catch (err: any) {
      setError(err.message || "Failed to generate match score")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchMatch() }, [params.id])

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-brand/25 blur-xl animate-pulse-glow" />
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/25 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-brand-cyan" />
          </div>
        </div>
        <p className="font-semibold text-foreground">Analyzing Founder-Idea Fit…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <p className="text-lg font-semibold">{error || "Failed"}</p>
        <Button onClick={fetchMatch} className="gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary press">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    )
  }

  const verdictBadge =
    data.match_score >= 75
      ? "bg-success/10 text-success border-success/25"
      : data.match_score >= 50
        ? "bg-warning/10 text-warning border-warning/25"
        : "bg-danger/10 text-danger border-danger/25"

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-up">
      <div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-brand-cyan mb-3">
          <UserCheck className="h-3 w-3" /> Founder Match
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">Founder-Idea Match Score</h1>
        <p className="text-muted-foreground mt-1 text-sm">How well do your skills align with this idea?</p>
      </div>

      {/* Score Card */}
      <div className="relative rounded-2xl border-gradient overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row items-center gap-8">
          <MatchRing score={data.match_score} />
          <div className="flex-1 text-center md:text-left">
            <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border mb-3 ${verdictBadge}`}>
              {data.verdict}
            </span>
            <p className="text-foreground/90 leading-relaxed">{data.advice}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="card-premium rounded-2xl p-6">
          <h3 className="flex items-center gap-2.5 font-semibold text-base mb-4">
            <span className="w-8 h-8 rounded-lg bg-success/10 border border-success/25 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </span>
            Your Strengths
          </h3>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
            {data.strengths.map((s, i) => (
              <motion.div key={i} variants={itemVariants} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>{s}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Gaps */}
        <div className="card-premium rounded-2xl p-6">
          <h3 className="flex items-center gap-2.5 font-semibold text-base mb-4">
            <span className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </span>
            Skills to Develop
          </h3>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
            {data.gaps.map((g, i) => (
              <motion.div key={i} variants={itemVariants} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <Target className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>{g}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Ideal Co-Founder */}
      <div className="relative rounded-2xl border-gradient p-6">
        <h3 className="flex items-center gap-2.5 font-semibold text-base mb-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
            <Users className="h-4 w-4 text-brand-cyan" />
          </span>
          Ideal Co-Founder <span className="accent-serif text-gradient">Profile</span>
        </h3>
        <p className="text-foreground/90 leading-relaxed text-sm">{data.recommended_cofounder}</p>
        <Link href="/dashboard/cofounder">
          <Button className="mt-5 gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press">
            <Users className="h-4 w-4" /> Find Co-Founders <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
