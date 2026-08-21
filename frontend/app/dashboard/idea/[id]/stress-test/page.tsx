"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert, AlertTriangle, CheckCircle2,
  Flame, Skull, Heart, RefreshCw, HelpCircle, ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface DevilQuestion {
  question: string
  why_it_matters: string
  suggested_answer: string
}

interface WorstCase {
  scenario: string
  probability: string
  mitigation: string
}

interface StressData {
  stress_score: number
  stress_grade: string
  devil_questions: DevilQuestion[]
  worst_case_scenarios: WorstCase[]
  kill_scenarios: string[]
  survival_tips: string[]
  final_verdict: string
}

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

export default function StressTestPage() {
  const params = useParams()
  const [data, setData] = useState<StressData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedQ, setExpandedQ] = useState<number | null>(null)

  const runTest = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/ideas/${params.id}/stress-test`, { method: "POST" })
      setData(res.data)
    } catch (err: any) {
      setError(err.message || "Stress test failed")
    } finally {
      setIsLoading(false)
    }
  }

  const gradeColor: Record<string, string> = {
    A: "text-success bg-success/10 border-success/30",
    B: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/30",
    C: "text-warning bg-warning/10 border-warning/30",
    D: "text-warning bg-danger/10 border-danger/25",
    F: "text-danger bg-danger/10 border-danger/30",
  }

  const probColor: Record<string, string> = {
    High: "bg-danger/10 text-danger border-danger/25",
    Medium: "bg-warning/10 text-warning border-warning/25",
    Low: "bg-success/10 text-success border-success/25",
  }

  // Initial state — show start button
  if (!data && !isLoading && !error) {
    return (
      <div className="max-w-lg mx-auto py-10 animate-fade-up">
        <div className="card-premium rounded-2xl py-16 px-8 text-center flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-danger/25 blur-xl animate-pulse-glow" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-danger/25 to-danger/10 border border-danger/25 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-danger" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Adversarial Analysis</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">AI Stress Test</h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Let our AI play devil&apos;s advocate. It will find every weakness, ask the toughest investor questions,
              and identify scenarios that could kill your idea — then tell you how to survive.
            </p>
          </div>
          <Button onClick={runTest} size="lg" className="gap-2 rounded-xl bg-danger hover:bg-danger/90 text-white px-8 shimmer press shadow-[0_0_24px_oklch(0.63_0.21_22/0.4)]">
            <Flame className="h-5 w-5" /> Start Stress Test
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-danger/25 blur-xl animate-pulse-glow" />
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-danger/25 to-danger/10 border border-danger/25 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-danger" />
          </div>
        </div>
        <p className="font-semibold text-foreground">Running Stress Test…</p>
        <p className="text-sm text-muted-foreground">Finding every possible weakness</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <p className="text-lg font-semibold">{error}</p>
        <Button onClick={runTest} className="gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary press">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 animate-fade-up">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-danger mb-3">
          <ShieldAlert className="h-3 w-3" /> Stress Test
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">Stress Test Results</h1>
      </div>

      {/* Score Card */}
      <div className="relative rounded-2xl border-gradient overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="text-center shrink-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className={cn(
                "inline-flex items-center justify-center w-24 h-24 rounded-2xl text-5xl font-black border-2",
                gradeColor[data.stress_grade] || gradeColor.C
              )}
            >
              {data.stress_grade}
            </motion.div>
            <p className="text-sm text-muted-foreground mt-2 tabular-nums">{data.stress_score}/100 resilience</p>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-lg font-semibold mb-2 tracking-tight">Final <span className="accent-serif text-gradient">Verdict</span></h2>
            <p className="text-foreground/90 leading-relaxed text-sm">{data.final_verdict}</p>
          </div>
          <Button onClick={runTest} variant="outline" size="sm" className="gap-2 shrink-0 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press">
            <RefreshCw className="h-3.5 w-3.5" /> Re-test
          </Button>
        </div>
      </div>

      {/* Devil's Advocate Questions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2.5 tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/25 flex items-center justify-center">
            <HelpCircle className="h-4 w-4 text-danger" />
          </span>
          Devil&apos;s Advocate Questions
        </h2>
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
          {data.devil_questions.map((dq, i) => (
            <motion.div key={i} variants={itemVariants} className="card-premium rounded-2xl overflow-hidden">
              <button
                className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors"
                onClick={() => setExpandedQ(expandedQ === i ? null : i)}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-7 w-7 rounded-full bg-danger/10 border border-danger/25 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold font-mono text-danger">{i + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{dq.question}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{dq.why_it_matters}</p>
                  </div>
                </div>
                {expandedQ === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {expandedQ === i && (
                <div className="px-4 pb-4 pt-0 ml-10 border-t border-white/[0.06]">
                  <div className="mt-3 p-3.5 rounded-xl bg-success/[0.07] border border-success/25">
                    <p className="text-xs font-semibold text-success mb-1.5 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" /> Suggested Answer
                    </p>
                    <p className="text-sm text-success/85 leading-relaxed">{dq.suggested_answer}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Worst Case Scenarios */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2.5 tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </span>
          Worst-Case Scenarios
        </h2>
        <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
          {data.worst_case_scenarios.map((wc, i) => (
            <motion.div key={i} variants={itemVariants} className="card-premium card-premium-hover rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-foreground">{wc.scenario}</h3>
                <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0", probColor[wc.probability] || "bg-white/[0.05] text-muted-foreground border-white/10")}>
                  {wc.probability} risk
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground/80">Mitigation:</strong> {wc.mitigation}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Kill Scenarios */}
        <div className="card-premium rounded-2xl p-6 border-danger/20">
          <h3 className="flex items-center gap-2.5 font-semibold text-base mb-4">
            <span className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/25 flex items-center justify-center">
              <Skull className="h-4 w-4 text-danger" />
            </span>
            Idea Killers
          </h3>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
            {data.kill_scenarios.map((k, i) => (
              <motion.div key={i} variants={itemVariants} className="flex items-start gap-2.5 text-sm">
                <Skull className="h-3.5 w-3.5 text-danger shrink-0 mt-1" />
                <span className="text-foreground/85 leading-relaxed">{k}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Survival Tips */}
        <div className="card-premium rounded-2xl p-6 border-success/20">
          <h3 className="flex items-center gap-2.5 font-semibold text-base mb-4">
            <span className="w-8 h-8 rounded-lg bg-success/10 border border-success/25 flex items-center justify-center">
              <Heart className="h-4 w-4 text-success" />
            </span>
            Survival Tips
          </h3>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
            {data.survival_tips.map((t, i) => (
              <motion.div key={i} variants={itemVariants} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-1" />
                <span className="text-foreground/85 leading-relaxed">{t}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
