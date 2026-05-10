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

const STAGES = [
  {
    key: "validation",
    number: 1,
    label: "Idea Validation",
    icon: Sparkles,
    detail: "Evaluating your concept's viability, uniqueness, and real-world potential",
    color: "from-violet-500 to-purple-600",
    lightColor: "bg-violet-500/10 border-violet-500/20",
    textColor: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "market_research",
    number: 2,
    label: "Market Research",
    icon: TrendingUp,
    detail: "Analyzing market size, growth trends, and demand signals for your idea",
    color: "from-blue-500 to-cyan-600",
    lightColor: "bg-blue-500/10 border-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "target_audience",
    number: 3,
    label: "Target Audience",
    icon: Users,
    detail: "Identifying your ideal customers, their pain points and buying behavior",
    color: "from-sky-500 to-blue-600",
    lightColor: "bg-sky-500/10 border-sky-500/20",
    textColor: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "competitor_analysis",
    number: 4,
    label: "Competitor Analysis",
    icon: Swords,
    detail: "Mapping the competitive landscape — who's winning and why",
    color: "from-orange-500 to-red-600",
    lightColor: "bg-orange-500/10 border-orange-500/20",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "monetization",
    number: 5,
    label: "Monetization Strategy",
    icon: DollarSign,
    detail: "Building revenue models, pricing strategy, and financial projections",
    color: "from-emerald-500 to-green-600",
    lightColor: "bg-emerald-500/10 border-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "mvp_planning",
    number: 6,
    label: "MVP Blueprint",
    icon: ShieldCheck,
    detail: "Defining what to build first — core features, tech stack, and timeline",
    color: "from-amber-500 to-yellow-600",
    lightColor: "bg-amber-500/10 border-amber-500/20",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "gtm_strategy",
    number: 7,
    label: "Go-To-Market",
    icon: Briefcase,
    detail: "Crafting your launch strategy, channels, and customer acquisition plan",
    color: "from-pink-500 to-rose-600",
    lightColor: "bg-pink-500/10 border-pink-500/20",
    textColor: "text-pink-600 dark:text-pink-400",
  },
  {
    key: "final_report",
    number: 8,
    label: "Final Report",
    icon: FileText,
    detail: "Compiling everything into a comprehensive investor-ready analysis",
    color: "from-slate-600 to-slate-800",
    lightColor: "bg-slate-500/10 border-slate-500/20",
    textColor: "text-slate-600 dark:text-slate-400",
  },
]

type StageStatus = "pending" | "active" | "completed"

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
        transition={{ duration: 0.4 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-semibold text-muted-foreground mb-4">
          {status === "completed" ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Analysis Complete</>
          ) : (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> AI Analysis In Progress</>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
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
          <span>{completedCount} of 8 stages complete</span>
          <span className="font-bold">{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-foreground"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Stage Cards ── */}
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const stageStatus = getStageStatus(stage)
          const Icon = stage.icon
          const isCompleted = stageStatus === "completed"
          const isActive = stageStatus === "active"
          const isPending = stageStatus === "pending"

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
            >
              <div
                className={cn(
                  "relative rounded-2xl border transition-all duration-500 overflow-hidden",
                  isCompleted
                    ? "bg-foreground/[0.02] border-foreground/10"
                    : isActive
                    ? "bg-card border-foreground/25 shadow-lg"
                    : "bg-transparent border-border/40 opacity-45"
                )}
              >
                {/* Active glow pulse bar at top */}
                {isActive && (
                  <motion.div
                    className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", stage.color)}
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
                          ? "bg-foreground text-background"
                          : isActive
                          ? cn("border-2", stage.lightColor)
                          : "bg-muted text-muted-foreground/30"
                      )}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </motion.div>
                      ) : isActive ? (
                        <Icon className={cn("h-5 w-5", stage.textColor)} />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    {/* Stage number pill */}
                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
                      <span className="text-[8px] font-bold text-muted-foreground">{stage.number}</span>
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={cn(
                          "text-sm font-bold leading-none",
                          isPending ? "text-muted-foreground/40" : "text-foreground"
                        )}
                      >
                        {stage.label}
                      </p>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", stage.lightColor, stage.textColor)}
                        >
                          Running
                        </motion.span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Done
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
                      <Loader2 className={cn("h-5 w-5 animate-spin", stage.textColor)} />
                    ) : isCompleted ? (
                      <span className="text-xs font-bold text-muted-foreground">Stage {stage.number}/8</span>
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground/25" />
                    )}
                  </div>
                </div>

                {/* Active stage: animated progress shimmer */}
                {isActive && (
                  <div className="mx-5 mb-4">
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full bg-gradient-to-r", stage.color)}
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
            className="mt-6 p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.03] text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
              className="h-20 w-20 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-3xl font-black">{overallScore}</span>
            </motion.div>
            <p className="text-xl font-bold text-foreground">Analysis Complete!</p>
            <p className="text-sm text-muted-foreground mt-1.5">
              Your idea scored <strong className="text-foreground">{overallScore}/100</strong>. Redirecting to your full report…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
