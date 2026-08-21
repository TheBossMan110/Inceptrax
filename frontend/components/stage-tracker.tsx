"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Swords,
  DollarSign,
  ShieldCheck,
  Briefcase,
  FileText,
  Clock,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface StageTrackerProps {
  ideaId: number
  onComplete?: (score: number) => void
}

const EASE = [0.22, 1, 0.36, 1] as const

const STAGES = [
  {
    key: "validation",
    number: 1,
    label: "Idea Validation",
    icon: Sparkles,
    detail: "Evaluating your concept's viability, uniqueness, and real-world potential",
  },
  {
    key: "market_research",
    number: 2,
    label: "Market Research",
    icon: TrendingUp,
    detail: "Analyzing market size, growth trends, and demand signals for your idea",
  },
  {
    key: "target_audience",
    number: 3,
    label: "Target Audience",
    icon: Users,
    detail: "Identifying your ideal customers, their pain points and buying behavior",
  },
  {
    key: "competitor_analysis",
    number: 4,
    label: "Competitor Analysis",
    icon: Swords,
    detail: "Mapping the competitive landscape — who's winning and why",
  },
  {
    key: "monetization",
    number: 5,
    label: "Monetization Strategy",
    icon: DollarSign,
    detail: "Building revenue models, pricing strategy, and financial projections",
  },
  {
    key: "mvp_planning",
    number: 6,
    label: "MVP Blueprint",
    icon: ShieldCheck,
    detail: "Defining what to build first — core features, tech stack, and timeline",
  },
  {
    key: "gtm_strategy",
    number: 7,
    label: "Go-To-Market",
    icon: Briefcase,
    detail: "Crafting your launch strategy, channels, and customer acquisition plan",
  },
  {
    key: "final_report",
    number: 8,
    label: "Final Report",
    icon: FileText,
    detail: "Compiling everything into a comprehensive investor-ready analysis",
  },
]

type StageStatus = "pending" | "active" | "completed"

/* Animated score ring for the completion card */
function CompletionRing({ score }: { score: number }) {
  const R = 44
  const C = 2 * Math.PI * R
  return (
    <div className="relative h-28 w-28 mx-auto">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="7" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="url(#trackerScoreGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * Math.min(100, Math.max(0, score))) / 100 }}
          transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
        />
        <defs>
          <linearGradient id="trackerScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.75 0.13 215)" />
            <stop offset="55%" stopColor="oklch(0.585 0.222 277)" />
            <stop offset="100%" stopColor="oklch(0.64 0.24 305)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight">{score}</span>
        <span className="text-[8px] font-mono uppercase tracking-[0.22em] text-muted-foreground">score</span>
      </div>
    </div>
  )
}

export function StageTracker({ ideaId, onComplete }: StageTrackerProps) {
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [currentStage, setCurrentStage] = useState(0)
  const [status, setStatus] = useState<string>("processing")
  const [overallScore, setOverallScore] = useState(0)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const completedRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/ideas/${ideaId}/status`)
      setCompletedStages(res.completed_stages || [])
      setCurrentStage(res.current_stage || 0)
      setStatus(res.status || "processing")
      setOverallScore(res.overall_score || 0)

      if (res.status === "completed" && !completedRef.current) {
        completedRef.current = true
        if (pollRef.current) clearInterval(pollRef.current)
        onComplete?.(res.overall_score || 0)
      }
      if (res.status === "failed" && pollRef.current) {
        clearInterval(pollRef.current)
      }
    } catch {
      // silent
    }
  }, [ideaId, onComplete])

  useEffect(() => {
    fetchStatus()
    pollRef.current = setInterval(fetchStatus, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchStatus])

  const getStageStatus = (stage: typeof STAGES[0]): StageStatus => {
    if (completedStages.includes(stage.key)) return "completed"
    if (currentStage === stage.number) return "active"
    return "pending"
  }

  const completedCount = completedStages.length
  const progressPercent = Math.round((completedCount / STAGES.length) * 100)
  const activeStage = STAGES.find(s => currentStage === s.number)

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-4">
          {status === "completed" ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Analysis Complete</>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
              </span>
              AI Analysis In Progress
            </>
          )}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-gradient-subtle">
          {status === "completed" ? "Your Idea Has Been Analyzed" : "Analyzing Your Idea"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          {status === "completed"
            ? `Scored ${overallScore}/100 — view your full report below`
            : activeStage
            ? `Currently running: ${activeStage.label}`
            : "Starting analysis…"}
        </p>
      </motion.div>

      {/* ── Progress bar ── */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span className="font-mono uppercase tracking-[0.14em] text-[10px]">{completedCount} of 8 stages complete</span>
          <span className="font-bold tabular-nums text-brand-cyan">{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: EASE }}
          />
        </div>
      </div>

      {/* ── Stage Cards ── */}
      <div className="flex flex-col">
        {STAGES.map((stage, idx) => {
          const stageStatus = getStageStatus(stage)
          const Icon = stage.icon
          const isCompleted = stageStatus === "completed"
          const isActive = stageStatus === "active"
          const isPending = stageStatus === "pending"
          const prevCompleted = idx > 0 && getStageStatus(STAGES[idx - 1]) === "completed"

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35, ease: EASE }}
            >
              {/* Connector line — fills with gradient as stages complete */}
              {idx > 0 && (
                <div className="ml-[41px] h-3.5 w-0.5 rounded-full overflow-hidden bg-white/[0.06]">
                  <motion.div
                    className="w-full bg-gradient-to-b from-brand-cyan via-brand to-brand-violet"
                    initial={{ height: 0 }}
                    animate={{ height: prevCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                </div>
              )}

              <div
                className={cn(
                  "relative rounded-2xl border transition-all duration-500 overflow-hidden",
                  isCompleted
                    ? "card-premium"
                    : isActive
                    ? "bg-brand/10 border-brand/25 shadow-[0_8px_32px_-12px_oklch(0.585_0.222_277/0.45)]"
                    : "bg-transparent border-white/[0.05] opacity-45"
                )}
              >
                {/* Active glow pulse hairline at top */}
                {isActive && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Stage number + status */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300",
                        isCompleted
                          ? "bg-success/10 border border-success/25"
                          : isActive
                          ? "bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/30"
                          : "bg-white/[0.03] border border-white/[0.06] text-muted-foreground/30"
                      )}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </motion.div>
                      ) : isActive ? (
                        <Icon className="h-5 w-5 text-brand-cyan" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    {/* Stage number pill */}
                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background border border-white/15 flex items-center justify-center">
                      <span className="text-[8px] font-mono font-bold text-muted-foreground">{stage.number}</span>
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-none",
                          isPending ? "text-muted-foreground/40" : "text-foreground"
                        )}
                      >
                        {stage.label}
                      </p>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border border-brand/25 bg-brand/15 text-brand-cyan"
                        >
                          <span className="h-1 w-1 rounded-full bg-brand-cyan animate-pulse-glow" />
                          Running
                        </motion.span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs leading-relaxed",
                        isActive ? "text-muted-foreground" : "text-muted-foreground/40"
                      )}
                    >
                      {stage.detail}
                    </p>
                  </div>

                  {/* Right status */}
                  <div className="shrink-0">
                    {isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin text-brand" />
                    ) : isCompleted ? (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground/70 tabular-nums">Stage {stage.number}/8</span>
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground/25" />
                    )}
                  </div>
                </div>

                {/* Active stage: animated progress shimmer */}
                {isActive && (
                  <div className="mx-5 mb-4">
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        style={{ width: "60%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Completion Card ── */}
      <AnimatePresence>
        {status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
            className="mt-6 relative rounded-2xl border-gradient p-6 text-center"
          >
            <CompletionRing score={overallScore} />
            <p className="text-xl font-semibold tracking-tight text-foreground mt-4">
              Analysis <span className="accent-serif text-gradient">Complete</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              Your idea scored <strong className="text-foreground tabular-nums">{overallScore}/100</strong>. Redirecting to your full report…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
