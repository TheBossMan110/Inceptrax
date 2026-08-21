"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  FlaskConical,
  ExternalLink,
  CheckCircle2,
  Circle,
  Wrench,
  BookOpen,
  ChevronRight,
  ArrowUpRight,
  Zap,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Users,
  DollarSign,
  FileText,
  Trophy,
  PartyPopper,
  Target,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ResearchLink {
  title: string
  url: string
  source: string
  relevance: string
}

interface ChecklistItem {
  phase: "Validation" | "MVP" | "Growth"
  step: string
  description: string
}

interface ToolRecommendation {
  name: string
  category: string
  url: string
  use_case: string
}

interface Community {
  name: string
  type: string
  url: string
  members: string
  relevance: string
}

interface Investor {
  name: string
  type: string
  focus: string
  stage: string
  url: string
}

interface Template {
  name: string
  type: string
  url: string
  description: string
}

interface Milestone {
  phase: string
  duration: string
  title: string
  goals: string[]
  kpis: string[]
  completion_message: string
}

interface HubData {
  research_links: ResearchLink[]
  execution_checklist: ChecklistItem[]
  tool_recommendations: ToolRecommendation[]
  communities?: Community[]
  investors?: Investor[]
  templates?: Template[]
  milestones?: Milestone[]
  // Legacy field (backward compat)
  action_plan?: { week: number; focus: string; tasks: string[] }[]
}

// ─────────────────────────────────────────────
// Section Tab configuration
// ─────────────────────────────────────────────
const TABS = [
  { id: "research",  label: "Deep Research",       icon: BookOpen },
  { id: "checklist", label: "Execution Checklist",  icon: CheckCircle2 },
  { id: "resources", label: "Resources",            icon: Wrench },
  { id: "progress",  label: "90-Day Tracker",       icon: Trophy },
] as const

type TabId = typeof TABS[number]["id"]

// Phase styling — Midnight Aurora tokens
const PHASE_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  Validation: { color: "text-brand-cyan",   bg: "bg-brand-cyan/[0.04]",   dot: "bg-brand-cyan" },
  MVP:        { color: "text-brand-violet", bg: "bg-brand-violet/[0.04]", dot: "bg-brand-violet" },
  Build:      { color: "text-brand-violet", bg: "bg-brand-violet/[0.04]", dot: "bg-brand-violet" },
  Growth:     { color: "text-success",      bg: "bg-success/[0.04]",      dot: "bg-success" },
}

const MILESTONE_COLORS: Record<string, { bg: string; border: string; icon: string; fill: string }> = {
  Validation: { bg: "bg-brand-cyan/[0.07]",   border: "border-brand-cyan/25",   icon: "text-brand-cyan",   fill: "bg-brand-cyan" },
  Build:      { bg: "bg-brand-violet/[0.07]", border: "border-brand-violet/25", icon: "text-brand-violet", fill: "bg-brand-violet" },
  Growth:     { bg: "bg-success/[0.07]",      border: "border-success/25",      icon: "text-success",      fill: "bg-success" },
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

/** Gradient progress bar (cyan → indigo → violet) */
function GradientBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 rounded-full bg-white/[0.06] overflow-hidden", className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </div>
  )
}

/**
 * Safely extract a string value from a field that may be:
 * - A plain string: return as-is
 * - A JSON-stringified object: parse and extract `field` key
 * - An object: extract `field` key directly
 */
function safeStr(value: any, field?: string): string {
  if (typeof value === "string") {
    // Try to detect if it looks like a JSON object string
    const trimmed = value.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (field && parsed[field] != null) return String(parsed[field])
        if (typeof parsed === "object") return Object.values(parsed).filter(Boolean).join(" — ")
        return String(parsed)
      } catch {
        return value
      }
    }
    return value
  }
  if (value == null) return ""
  if (typeof value === "object") {
    if (field && value[field] != null) return String(value[field])
    return Object.values(value).filter(Boolean).join(" — ")
  }
  return String(value)
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ResearchHubPage() {
  const params = useParams()
  const ideaId = params.id as string

  const [hub, setHub]           = useState<HubData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("research")
  const [checked, setChecked]   = useState<Record<string, boolean>>({})
  const [completedPhases, setCompletedPhases] = useState<Record<string, boolean>>({})

  // ── Load persisted checkbox state ──────────
  useEffect(() => {
    if (!ideaId) return
    const stored = localStorage.getItem(`hub-checklist-${ideaId}`)
    if (stored) setChecked(JSON.parse(stored))
    const storedPhases = localStorage.getItem(`hub-phases-${ideaId}`)
    if (storedPhases) setCompletedPhases(JSON.parse(storedPhases))
  }, [ideaId])

  // ── Fetch / generate hub data ───────────────
  const fetchHub = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiFetch(`/ideas/${ideaId}/research-hub`, { method: "POST" })
      if (response.data?.hub) {
        setHub(response.data.hub)
      } else {
        setError("Hub data could not be retrieved.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate Research Hub.")
    } finally {
      setIsLoading(false)
    }
  }, [ideaId])

  useEffect(() => { fetchHub() }, [fetchHub])

  // ── Toggle checkbox with persistence ───────
  const toggleCheck = (key: string) => {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`hub-checklist-${ideaId}`, JSON.stringify(next))
      return next
    })
  }

  // ── Mark milestone phase complete ───────
  const togglePhaseComplete = (phase: string) => {
    setCompletedPhases(prev => {
      const next = { ...prev, [phase]: !prev[phase] }
      localStorage.setItem(`hub-phases-${ideaId}`, JSON.stringify(next))
      return next
    })
  }

  // ─────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-brand/25 blur-xl animate-pulse-glow" />
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/25 flex items-center justify-center">
              <FlaskConical className="h-7 w-7 text-brand-cyan" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Generating your Research Hub…</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Our AI is curating resources, tools, and a 90-day plan specific to your idea.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Error State
  // ─────────────────────────────────────────────
  if (error || !hub) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <div className="card-premium rounded-2xl py-16 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center mb-5">
            <AlertCircle className="h-6 w-6 text-danger" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Hub Generation Failed</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{error || "Unknown error occurred."}</p>
          <Button onClick={() => fetchHub()} className="gap-2 mt-6 rounded-xl bg-primary hover:bg-primary/90 glow-primary press">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    )
  }

  // ── Checklist stats ─────────────────────────
  const phases = ["Validation", "MVP", "Growth"] as const
  const byPhase = (phase: string) =>
    hub.execution_checklist.filter(item => item.phase === phase)
  const phaseProgress = (phase: string) => {
    const items = byPhase(phase)
    if (!items.length) return 0
    const done = items.filter((_, i) => checked[`${phase}-${i}`]).length
    return Math.round((done / items.length) * 100)
  }
  const totalDone  = hub.execution_checklist.filter((item, i) => checked[`${item.phase}-${byPhase(item.phase).indexOf(item)}`]).length
  const totalSteps = hub.execution_checklist.length

  const communities = hub.communities || []
  const investors = hub.investors || []
  const templates = hub.templates || []
  const milestones = hub.milestones || []

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fade-up">
      {/* ── Hero ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-brand-cyan">
              <FlaskConical className="h-3 w-3" />
              Research &amp; Execution Hub
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">
            Your Execution Playbook
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Curated resources, step-by-step guides, and tools — tailored to your idea&apos;s stage and industry.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
          onClick={() => fetchHub(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Hub
        </Button>
      </div>

      {/* ── Stat Pills ── */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Research Links",  value: hub.research_links.length,        icon: BookOpen,   color: "text-brand-cyan",   chip: "from-brand-cyan/25 to-brand/15 border-brand-cyan/20" },
          { label: "Checklist Steps", value: `${totalDone}/${totalSteps}`,     icon: CheckCircle2, color: "text-brand-violet", chip: "from-brand-violet/25 to-brand-fuchsia/15 border-brand-violet/20" },
          { label: "Resources",       value: (hub.tool_recommendations.length + communities.length + investors.length + templates.length),  icon: Wrench,     color: "text-warning",      chip: "from-warning/25 to-warning/10 border-warning/20" },
          { label: "Milestones",      value: milestones.length > 0 ? `${Object.keys(completedPhases).filter(k => completedPhases[k]).length}/${milestones.length}` : "3 Phases", icon: Trophy,  color: "text-success",      chip: "from-success/25 to-success/10 border-success/20" },
        ].map(stat => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className="flex items-center gap-3 p-4 rounded-2xl card-premium"
          >
            <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br border flex items-center justify-center shrink-0", stat.chip)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 truncate">{stat.label}</p>
              <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Section Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all press",
              activeTab === tab.id
                ? "bg-brand/15 text-foreground border border-brand/25"
                : "text-muted-foreground border border-transparent hover:bg-white/[0.05]"
            )}
          >
            <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.id && "text-brand-cyan")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          Section: Deep Dive Research
      ═══════════════════════════════════════════ */}
      {activeTab === "research" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <BookOpen className="h-5 w-5 text-brand-cyan" />
            <h2 className="text-lg font-semibold text-foreground">Deep Dive Research</h2>
            <span className="text-sm text-muted-foreground ml-1">— Authoritative sources for your market</span>
          </div>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
            {hub.research_links.map((link, i) => (
              <motion.a
                key={i}
                variants={itemVariants}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-4 rounded-2xl card-premium card-premium-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground shrink-0">
                        {link.source}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-brand-cyan transition-colors line-clamp-2">
                      {link.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                      {link.relevance}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-cyan transition-colors shrink-0 mt-1" />
                </div>
              </motion.a>
            ))}
          </motion.div>
          {hub.research_links.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No research links available.</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Section: Execution Checklist
      ═══════════════════════════════════════════ */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <CheckCircle2 className="h-5 w-5 text-brand-cyan" />
            <h2 className="text-lg font-semibold text-foreground">Execution Checklist</h2>
            <span className="text-sm text-muted-foreground ml-1">— Your progress is saved automatically</span>
          </div>

          {/* Overall progress */}
          <div className="p-5 rounded-2xl card-premium">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Overall Progress</span>
              <span className="text-sm font-bold tabular-nums text-brand-cyan">{totalDone}/{totalSteps} steps</span>
            </div>
            <GradientBar value={totalSteps ? Math.round(totalDone / totalSteps * 100) : 0} className="h-2" />
          </div>

          {/* Phases */}
          {phases.map(phase => {
            const items  = byPhase(phase)
            const prog   = phaseProgress(phase)
            const cfg    = PHASE_CONFIG[phase]
            if (!cfg) return null
            return (
              <div key={phase} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                    <h3 className={cn("font-mono font-semibold text-xs uppercase tracking-[0.18em]", cfg.color)}>
                      {phase} Phase
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium tabular-nums">{prog}% complete</span>
                </div>
                <GradientBar value={prog} className="h-1" />
                <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-2">
                  {items.map((item, i) => {
                    const key    = `${phase}-${i}`
                    const isDone = !!checked[key]
                    return (
                      <motion.button
                        key={i}
                        variants={itemVariants}
                        onClick={() => toggleCheck(key)}
                        className={cn(
                          "group w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left press",
                          isDone
                            ? "bg-white/[0.02] border-white/[0.05] opacity-60"
                            : cn("border-white/[0.08] hover:border-brand/30", cfg.bg)
                        )}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isDone
                            ? <CheckCircle2 className={cn("h-4 w-4", cfg.color)} />
                            : <Circle className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium transition-colors",
                            isDone ? "line-through text-muted-foreground" : "text-foreground"
                          )}>
                            {safeStr(item.step, "step")}
                          </p>
                          {!isDone && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {safeStr(item.description, "description")}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </motion.div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Section: Resources (Tools + Communities + Investors + Templates)
      ═══════════════════════════════════════════ */}
      {activeTab === "resources" && (
        <div className="space-y-8">
          {/* Tools */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-brand-cyan" />
              <h2 className="text-lg font-semibold text-foreground">Tools</h2>
              <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{hub.tool_recommendations.length}</span>
            </div>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hub.tool_recommendations.map((tool, i) => (
                <motion.div key={i} variants={itemVariants} className="rounded-2xl card-premium card-premium-hover overflow-hidden group p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-brand/10 border border-brand/25 text-brand-cyan mb-2">
                        {tool.category}
                      </span>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-brand-cyan transition-colors">
                        {tool.name}
                      </h3>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
                      <Zap className="h-3.5 w-3.5 text-brand-cyan" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{tool.use_case}</p>
                  <a href={tool.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press">
                      Open Tool <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Communities */}
          {communities.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-violet" />
                <h2 className="text-lg font-semibold text-foreground">Communities</h2>
                <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{communities.length}</span>
              </div>
              <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
                {communities.map((c, i) => (
                  <motion.a
                    key={i}
                    variants={itemVariants}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-4 rounded-2xl card-premium hover:border-brand-violet/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/20 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-brand-violet" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-brand-violet transition-colors">{c.name}</h3>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground shrink-0">{c.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">{c.members} members</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.relevance}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-brand-violet shrink-0" />
                  </motion.a>
                ))}
              </motion.div>
            </div>
          )}

          {/* Investors */}
          {investors.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <h2 className="text-lg font-semibold text-foreground">Investors</h2>
                <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{investors.length}</span>
              </div>
              <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
                {investors.map((inv, i) => (
                  <motion.a
                    key={i}
                    variants={itemVariants}
                    href={inv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-4 rounded-2xl card-premium hover:border-success/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-success/25 to-success/10 border border-success/20 flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-success transition-colors">{inv.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{inv.type}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{inv.stage}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{inv.focus}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-success shrink-0" />
                  </motion.a>
                ))}
              </motion.div>
            </div>
          )}

          {/* Templates */}
          {templates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold text-foreground">Templates</h2>
                <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{templates.length}</span>
              </div>
              <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((t, i) => (
                  <motion.a
                    key={i}
                    variants={itemVariants}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col p-4 rounded-2xl card-premium hover:border-warning/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-warning/10 border border-warning/25 text-warning">{t.type}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-warning" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-warning transition-colors">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
                  </motion.a>
                ))}
              </motion.div>
            </div>
          )}

          {hub.tool_recommendations.length === 0 && communities.length === 0 && investors.length === 0 && templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No resources available.</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Section: 90-Day Progress Tracker (3-Phase Milestones)
      ═══════════════════════════════════════════ */}
      {activeTab === "progress" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Trophy className="h-5 w-5 text-brand-cyan" />
            <h2 className="text-lg font-semibold text-foreground">90-Day Progress Tracker</h2>
            <span className="text-sm text-muted-foreground ml-1">— 3-phase milestone roadmap</span>
          </div>

          {/* Phase overview bar */}
          <div className="p-5 rounded-2xl card-premium">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Overall Progress</span>
              <span className="text-sm font-bold tabular-nums text-brand-cyan">
                {Object.keys(completedPhases).filter(k => completedPhases[k]).length}/{milestones.length || 3} phases
              </span>
            </div>
            <div className="flex gap-2">
              {(milestones.length > 0 ? milestones : [
                { phase: "Validation", duration: "Day 1-30", title: "Validate", goals: [], kpis: [], completion_message: "" },
                { phase: "Build", duration: "Day 31-60", title: "Build", goals: [], kpis: [], completion_message: "" },
                { phase: "Growth", duration: "Day 61-90", title: "Grow", goals: [], kpis: [], completion_message: "" },
              ]).map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-2.5 rounded-full transition-all",
                    completedPhases[m.phase]
                      ? MILESTONE_COLORS[m.phase]?.fill || "bg-brand"
                      : "bg-white/[0.06]"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Milestone Cards */}
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-6">
            {milestones.map((milestone, i) => {
              const isComplete = !!completedPhases[milestone.phase]
              const colors = MILESTONE_COLORS[milestone.phase] || MILESTONE_COLORS.Validation
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={cn(
                    "rounded-2xl card-premium overflow-hidden transition-all",
                    isComplete ? "opacity-75" : cn("border", colors.border)
                  )}
                >
                  <div className={cn("p-5 border-b border-white/[0.06]", colors.bg)}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-muted-foreground">{milestone.duration}</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full",
                            isComplete
                              ? "bg-success/10 text-success border border-success/25"
                              : "bg-white/[0.05] text-muted-foreground border border-white/10"
                          )}>
                            {isComplete && <CheckCircle2 className="h-3 w-3" />}
                            {isComplete ? "Complete" : "In Progress"}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight">{milestone.title}</h3>
                        <p className={cn("text-sm font-medium mt-0.5", colors.icon)}>{milestone.phase} Phase</p>
                      </div>
                      <Button
                        variant={isComplete ? "outline" : "default"}
                        size="sm"
                        className={cn(
                          "gap-2 shrink-0 rounded-xl press",
                          isComplete
                            ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                            : "bg-primary hover:bg-primary/90 glow-primary"
                        )}
                        onClick={() => togglePhaseComplete(milestone.phase)}
                      >
                        {isComplete ? (
                          <><CheckCircle2 className="h-4 w-4" /> Completed</>
                        ) : (
                          <><Target className="h-4 w-4" /> Mark Complete</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    {/* Goals */}
                    <div>
                      <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">Goals</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {milestone.goals.map((goal, j) => (
                          <div key={j} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <ChevronRight className={cn("h-4 w-4 shrink-0 mt-0.5", colors.icon)} />
                            <span className="text-sm text-foreground/90">{goal}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPIs */}
                    {milestone.kpis && milestone.kpis.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mb-3">Key Metrics (KPIs)</h4>
                        <div className="flex flex-wrap gap-2">
                          {milestone.kpis.map((kpi, j) => (
                            <span key={j} className="text-xs font-medium tabular-nums py-1.5 px-3 rounded-full bg-white/[0.04] border border-white/10 text-foreground/85">
                              {kpi}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion message (shown when phase is marked complete) */}
                    {isComplete && milestone.completion_message && (
                      <div className="p-4 rounded-xl bg-success/[0.07] border border-success/25 flex items-start gap-3">
                        <PartyPopper className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-success mb-0.5">Phase Complete!</p>
                          <p className="text-sm text-success/80">{milestone.completion_message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {milestones.length === 0 && (
            <div className="card-premium rounded-2xl py-14 px-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-brand-cyan" />
              </div>
              <p className="font-semibold text-foreground">No milestones generated yet</p>
              <p className="text-sm text-muted-foreground">Try refreshing the hub to generate your 90-day roadmap.</p>
            </div>
          )}

          {/* CTA to checklist */}
          <div className="mt-8 relative rounded-2xl border-gradient p-6 text-center space-y-2">
            <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-brand-cyan" />
            </div>
            <p className="font-semibold text-foreground">Track Daily Progress</p>
            <p className="text-sm text-muted-foreground">
              Use the Execution Checklist to track your daily tasks within each phase.
            </p>
            <Button
              size="sm"
              className="mt-2 gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
              onClick={() => setActiveTab("checklist")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Go to Checklist
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
