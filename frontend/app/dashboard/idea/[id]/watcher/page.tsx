"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye,
  Play,
  Loader2,
  ExternalLink,
  Mail,
  CalendarClock,
  Sparkles,
  RefreshCw,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  Radar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Finding {
  title: string
  url: string
  snippet: string
  score?: number
  why?: string
  unscored?: boolean
}

interface Digest {
  id: number
  subject: string
  intro: string
  takeaway: string
  findings: Finding[]
  email_sent: boolean
  trigger: string
  created_at: string
}

interface Settings {
  enabled: boolean
  frequency: "weekly" | "monthly"
  paused_until: string | null
  last_run_at: string | null
}

interface AgentRun {
  status: "running" | "complete" | "failed"
  current_node: string
  error?: string | null
}

const NODE_LABELS: Record<string, string> = {
  start: "Starting up",
  fetch_context: "Loading your idea",
  generate_queries: "Writing search queries",
  search: "Scanning the web",
  score_relevance: "Scoring what it found",
  synthesize: "Writing your digest",
  deliver: "Sending the email",
  end: "Finishing",
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
}

function scoreTint(score?: number) {
  if (!score) return "bg-white/[0.05] text-muted-foreground border-white/[0.08]"
  if (score >= 8) return "bg-success/10 text-success border-success/25"
  if (score >= 6) return "bg-warning/10 text-warning border-warning/25"
  return "bg-white/[0.05] text-muted-foreground border-white/[0.08]"
}

export default function IdeaWatcherPage() {
  const params = useParams()
  const ideaId = params.id as string

  const [settings, setSettings] = useState<Settings | null>(null)
  const [digests, setDigests] = useState<Digest[]>([])
  const [lastRun, setLastRun] = useState<AgentRun | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await apiFetch(`/agents/idea-watcher/${ideaId}`)
      const d = res.data
      setSettings(d.settings)
      setDigests(d.digests || [])
      setLastRun(d.last_run || null)
      setCooldownUntil(d.cooldown_until || null)
      if (d.digests?.length && openId === null) setOpenId(d.digests[0].id)
      return d.last_run?.status
    } catch (err: any) {
      console.error("Failed to load watcher state:", err)
    } finally {
      setIsLoading(false)
    }
  }, [ideaId, openId])

  useEffect(() => {
    fetchState()
  }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while a run is in flight
  useEffect(() => {
    if (!isRunning && lastRun?.status !== "running") return
    const interval = setInterval(async () => {
      const status = await fetchState()
      if (status && status !== "running") {
        setIsRunning(false)
        if (status === "complete") toast.success("Digest ready")
        if (status === "failed") toast.error("The run failed — try again in a moment")
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isRunning, lastRun?.status, fetchState])

  const handleRun = async () => {
    setIsRunning(true)
    try {
      await apiFetch(`/agents/idea-watcher/${ideaId}/run`, { method: "POST" })
      toast.success("Idea Watcher is running — about a minute")
      setTimeout(fetchState, 1500)
    } catch (err: any) {
      setIsRunning(false)
      toast.error(err?.message || "Could not start the run")
    }
  }

  const updateSettings = async (patch: Record<string, unknown>) => {
    try {
      const res = await apiFetch(`/agents/idea-watcher/${ideaId}/settings`, {
        method: "PUT",
        body: JSON.stringify(patch),
      })
      setSettings(res.data.settings)
      toast.success("Settings saved")
    } catch (err: any) {
      toast.error(err?.message || "Could not save settings")
    }
  }

  const running = isRunning || lastRun?.status === "running"
  const onCooldown = !!cooldownUntil && !running

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="skeleton h-56 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Agent · always on</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">
            Idea <span className="accent-serif text-gradient">Watcher</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            Scans the web every week for competitors, funding, and market shifts in
            your space — then emails you what actually matters.
          </p>
        </div>

        <Button
          onClick={handleRun}
          disabled={running || onCooldown}
          className="gap-2 shrink-0 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press w-full sm:w-auto"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Running…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Run now
            </>
          )}
        </Button>
      </div>

      {/* ── Live run state ─────────────────────────────────────── */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative rounded-2xl border-gradient overflow-hidden">
              <div className="glass-strong rounded-2xl p-5 flex items-center gap-4">
                <div className="relative h-11 w-11 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0">
                  <Radar className="h-5 w-5 text-brand-cyan animate-pulse-glow" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {NODE_LABELS[lastRun?.current_node || "start"] || "Working"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Searching, scoring, and writing your digest — about a minute.
                  </p>
                  <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet animate-beam" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {lastRun?.status === "failed" && !running && (
        <div className="card-premium rounded-2xl p-4 border-danger/25 bg-danger/[0.05] flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-danger">Last run didn&apos;t finish</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastRun.error || "Something went wrong. Run it again."}
            </p>
          </div>
        </div>
      )}

      {/* ── Settings ───────────────────────────────────────────── */}
      <div className="card-premium rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
              <Eye className="h-4 w-4 text-brand-cyan" />
            </div>
            <div>
              <p className="text-sm font-semibold">Weekly watching</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings?.paused_until
                  ? `Paused until ${new Date(settings.paused_until).toLocaleDateString()}`
                  : settings?.enabled
                    ? `Runs every ${settings.frequency === "monthly" ? "month" : "Monday"}`
                    : "Turned off"}
              </p>
            </div>
          </div>

          <Switch
            checked={!!settings?.enabled}
            onCheckedChange={(v) => updateSettings({ enabled: v })}
            aria-label="Toggle weekly watching"
          />
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 mr-1">
            Frequency
          </span>
          {(["weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              onClick={() => updateSettings({ frequency: f })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 border",
                settings?.frequency === f
                  ? "bg-brand/15 text-foreground border-brand/25"
                  : "text-muted-foreground border-transparent hover:bg-white/[0.05]"
              )}
            >
              {f}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {settings?.paused_until ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ pause_days: 0 })}
                className="gap-1.5 rounded-lg text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Resume
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ pause_days: 30 })}
                className="gap-1.5 rounded-lg text-xs border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
              >
                <PauseCircle className="h-3.5 w-3.5" /> Pause 30 days
              </Button>
            )}
          </div>
        </div>

        {onCooldown && (
          <p className="mt-3 text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3" />
            Manual runs are limited — next available at{" "}
            {new Date(cooldownUntil!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* ── Digests ────────────────────────────────────────────── */}
      {digests.length === 0 ? (
        <div className="card-premium rounded-2xl py-16 flex flex-col items-center text-center gap-4 px-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center animate-float">
            <Sparkles className="h-7 w-7 text-brand-cyan" />
          </div>
          <div>
            <p className="font-semibold text-lg">No digests yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Run it now to see what&apos;s moving in your market this week, or wait
              for Monday&apos;s scheduled scan.
            </p>
          </div>
          <Button
            onClick={handleRun}
            disabled={running || onCooldown}
            className="mt-1 gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
          >
            <Play className="h-4 w-4" /> Run the first scan
          </Button>
        </div>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
            {digests.length} digest{digests.length !== 1 ? "s" : ""}
          </p>

          {digests.map((d) => {
            const isOpen = openId === d.id
            return (
              <motion.article key={d.id} variants={itemVariants} className="card-premium rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : d.id)}
                  className="w-full text-left p-5 hover:bg-white/[0.02] transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-snug">{d.subject}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{d.intro}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                        {new Date(d.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand/10 text-brand-cyan border border-brand/20 tabular-nums">
                        {d.findings?.length || 0} finding{(d.findings?.length || 0) !== 1 ? "s" : ""}
                      </span>
                      {d.email_sent && (
                        <span className="flex items-center gap-1 text-[10px] text-success">
                          <Mail className="h-3 w-3" /> emailed
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4">
                        {/* Findings */}
                        <div className="space-y-2.5">
                          {(d.findings || []).map((f, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium leading-snug hover:text-brand-cyan transition-colors group inline-flex items-start gap-1.5"
                                >
                                  {f.title}
                                  <ExternalLink className="h-3 w-3 mt-1 shrink-0 opacity-50 group-hover:opacity-100" />
                                </a>
                                {!f.unscored && !!f.score && (
                                  <span
                                    className={cn(
                                      "text-[11px] font-semibold px-2 py-0.5 rounded-full border tabular-nums shrink-0",
                                      scoreTint(f.score)
                                    )}
                                  >
                                    {f.score}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                {f.snippet}
                              </p>
                              {f.why && (
                                <p className="text-xs mt-2.5 pt-2.5 border-t border-white/[0.05] leading-relaxed">
                                  <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-brand-cyan mr-1.5">
                                    Why it matters
                                  </span>
                                  <span className="text-foreground/80">{f.why}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Takeaway */}
                        <div className="relative rounded-xl border-gradient overflow-hidden">
                          <div className="glass-strong rounded-xl p-4">
                            <p className="eyebrow mb-2">What this means for you</p>
                            <p className="text-sm text-foreground/85 leading-relaxed">
                              {d.takeaway}
                            </p>
                          </div>
                        </div>

                        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                          <CheckCircle2 className="h-3 w-3" />
                          {d.trigger === "manual" ? "Run manually" : "Scheduled weekly run"} ·{" "}
                          {new Date(d.created_at).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
