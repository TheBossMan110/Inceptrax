"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  FlaskConical,
  ExternalLink,
  CheckCircle2,
  Circle,
  Wrench,
  BookOpen,
  Calendar,
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

// Phase styling
const PHASE_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  Validation: { color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-950/30",  dot: "bg-blue-500" },
  MVP:        { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", dot: "bg-violet-500" },
  Build:      { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", dot: "bg-violet-500" },
  Growth:     { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500" },
}

const MILESTONE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  Validation: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "text-blue-500" },
  Build:      { bg: "bg-violet-500/10", border: "border-violet-500/30", icon: "text-violet-500" },
  Growth:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "text-emerald-500" },
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
      <div className="flex flex-col h-[70vh] items-center justify-center gap-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FlaskConical className="h-7 w-7 text-primary animate-bounce" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-foreground">Generating your Research Hub…</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Our AI is curating resources, tools, and a 90-day plan specific to your idea.
          </p>
        </div>
        <div className="flex gap-2">
          {["Research", "Checklist", "Resources", "Milestones"].map((label, i) => (
            <div
              key={label}
              className="h-1.5 w-16 rounded-full bg-muted overflow-hidden"
            >
              <div
                className="h-full bg-primary rounded-full animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            </div>
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
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold text-foreground">Hub Generation Failed</h2>
        <p className="text-muted-foreground max-w-sm">{error || "Unknown error occurred."}</p>
        <Button onClick={() => fetchHub()} className="gap-2 mt-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
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
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* ── Hero ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none gap-1.5">
              <FlaskConical className="h-3 w-3" />
              Research &amp; Execution Hub
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Your Execution Playbook
          </h1>
          <p className="text-muted-foreground mt-1">
            Curated resources, step-by-step guides, and tools — tailored to your idea&apos;s stage and industry.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => fetchHub(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Hub
        </Button>
      </div>

      {/* ── Stat Pills ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Research Links",  value: hub.research_links.length,        icon: BookOpen,   color: "text-blue-500" },
          { label: "Checklist Steps", value: `${totalDone}/${totalSteps}`,     icon: CheckCircle2, color: "text-violet-500" },
          { label: "Resources",       value: (hub.tool_recommendations.length + communities.length + investors.length + templates.length),  icon: Wrench,     color: "text-amber-500" },
          { label: "Milestones",      value: milestones.length > 0 ? `${Object.keys(completedPhases).filter(k => completedPhases[k]).length}/${milestones.length}` : "3 Phases", icon: Trophy,  color: "text-emerald-500" },
        ].map(stat => (
          <div
            key={stat.label}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
          >
            <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          Section: Deep Dive Research
      ═══════════════════════════════════════════ */}
      {activeTab === "research" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Deep Dive Research</h2>
            <span className="text-sm text-muted-foreground ml-1">— Authoritative sources for your market</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {hub.research_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-xs font-medium border-border shrink-0">
                        {link.source}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {link.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                      {link.relevance}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
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
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Execution Checklist</h2>
            <span className="text-sm text-muted-foreground ml-1">— Your progress is saved automatically</span>
          </div>

          {/* Overall progress */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{totalDone}/{totalSteps} steps</span>
            </div>
            <Progress value={totalSteps ? Math.round(totalDone / totalSteps * 100) : 0} className="h-2" />
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
                    <div className={cn("w-2.5 h-2.5 rounded-full", cfg.dot)} />
                    <h3 className={cn("font-semibold text-sm uppercase tracking-wider", cfg.color)}>
                      {phase} Phase
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{prog}% complete</span>
                </div>
                <Progress value={prog} className="h-1.5" />
                <div className="space-y-2">
                  {items.map((item, i) => {
                    const key    = `${phase}-${i}`
                    const isDone = !!checked[key]
                    return (
                      <button
                        key={i}
                        onClick={() => toggleCheck(key)}
                        className={cn(
                          "group w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left",
                          isDone
                            ? "bg-muted/40 border-border/50 opacity-70"
                            : cn("border-border hover:border-primary/30", cfg.bg)
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
                      </button>
                    )
                  })}
                </div>
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
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Tools</h2>
              <Badge variant="secondary" className="text-xs">{hub.tool_recommendations.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hub.tool_recommendations.map((tool, i) => (
                <Card key={i} className="border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-2 font-medium">
                          {tool.category}
                        </Badge>
                        <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {tool.name}
                        </CardTitle>
                      </div>
                      <div className="p-1.5 rounded-lg bg-muted mt-1 shrink-0">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{tool.use_case}</p>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                        Open Tool <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Communities */}
          {communities.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-foreground">Communities</h2>
                <Badge variant="secondary" className="text-xs">{communities.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {communities.map((c, i) => (
                  <a
                    key={i}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-blue-500/30 hover:shadow-md transition-all"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">{c.name}</h3>
                        <Badge variant="outline" className="text-[10px] shrink-0">{c.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.members} members</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.relevance}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Investors */}
          {investors.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-foreground">Investors</h2>
                <Badge variant="secondary" className="text-xs">{investors.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {investors.map((inv, i) => (
                  <a
                    key={i}
                    href={inv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-emerald-500/30 hover:shadow-md transition-all"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-emerald-600 transition-colors">{inv.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{inv.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{inv.stage}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{inv.focus}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Templates */}
          {templates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-foreground">Templates</h2>
                <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((t, i) => (
                  <a
                    key={i}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col p-4 rounded-xl border border-border bg-card hover:border-amber-500/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px] font-medium">{t.type}</Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-amber-600 transition-colors">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  </a>
                ))}
              </div>
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
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">90-Day Progress Tracker</h2>
            <span className="text-sm text-muted-foreground ml-1">— 3-phase milestone roadmap</span>
          </div>

          {/* Phase overview bar */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-primary">
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
                    "flex-1 h-3 rounded-full transition-all",
                    completedPhases[m.phase]
                      ? MILESTONE_COLORS[m.phase]?.bg || "bg-primary"
                      : "bg-muted"
                  )}
                  style={{
                    background: completedPhases[m.phase]
                      ? i === 0 ? "rgb(59, 130, 246)" : i === 1 ? "rgb(139, 92, 246)" : "rgb(16, 185, 129)"
                      : undefined
                  }}
                />
              ))}
            </div>
          </div>

          {/* Milestone Cards */}
          <div className="space-y-6">
            {milestones.map((milestone, i) => {
              const isComplete = !!completedPhases[milestone.phase]
              const colors = MILESTONE_COLORS[milestone.phase] || MILESTONE_COLORS.Validation
              return (
                <Card key={i} className={cn(
                  "border-2 overflow-hidden transition-all",
                  isComplete ? "border-border/50 opacity-80" : colors.border
                )}>
                  <CardHeader className={cn("pb-3", colors.bg)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-semibold">{milestone.duration}</Badge>
                          <Badge className={cn("text-xs", isComplete ? "bg-green-500" : "bg-muted text-muted-foreground")}>
                            {isComplete ? "✓ Complete" : "In Progress"}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{milestone.title}</CardTitle>
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">{milestone.phase} Phase</p>
                      </div>
                      <Button
                        variant={isComplete ? "outline" : "default"}
                        size="sm"
                        className="gap-2 shrink-0"
                        onClick={() => togglePhaseComplete(milestone.phase)}
                      >
                        {isComplete ? (
                          <><CheckCircle2 className="h-4 w-4" /> Completed</>
                        ) : (
                          <><Target className="h-4 w-4" /> Mark Complete</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    {/* Goals */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Goals</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {milestone.goals.map((goal, j) => (
                          <div key={j} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30">
                            <ChevronRight className={cn("h-4 w-4 shrink-0 mt-0.5", colors.icon)} />
                            <span className="text-sm text-foreground">{goal}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KPIs */}
                    {milestone.kpis && milestone.kpis.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Key Metrics (KPIs)</h4>
                        <div className="flex flex-wrap gap-2">
                          {milestone.kpis.map((kpi, j) => (
                            <Badge key={j} variant="outline" className="text-xs font-medium py-1.5 px-3">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion message (shown when phase is marked complete) */}
                    {isComplete && milestone.completion_message && (
                      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 flex items-start gap-3">
                        <PartyPopper className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-0.5">Phase Complete! 🎉</p>
                          <p className="text-sm text-green-600 dark:text-green-400/80">{milestone.completion_message}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {milestones.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-semibold text-foreground">No milestones generated yet</p>
              <p className="text-sm text-muted-foreground">Try refreshing the hub to generate your 90-day roadmap.</p>
            </div>
          )}

          {/* CTA to checklist */}
          <div className="mt-8 p-5 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
            <TrendingUp className="h-8 w-8 text-primary mx-auto" />
            <p className="font-semibold text-foreground">Track Daily Progress</p>
            <p className="text-sm text-muted-foreground">
              Use the Execution Checklist to track your daily tasks within each phase.
            </p>
            <Button
              size="sm"
              className="mt-2 gap-2"
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
