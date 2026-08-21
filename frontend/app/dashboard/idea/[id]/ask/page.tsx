"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Send, Loader2, RefreshCw, Database, User, FileText,
  Radar, Target, GitBranch, Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Source { type: string; title: string; score: number }
interface Turn {
  role: "user" | "assistant"
  text: string
  sources?: Source[]
  grounded?: boolean
}

/** Each source type gets its own mark so provenance is scannable at a glance. */
const SOURCE_META: Record<string, { icon: React.ElementType; label: string; tone: string }> = {
  idea: { icon: Lightbulb, label: "Idea", tone: "text-brand-cyan" },
  stage_result: { icon: FileText, label: "Analysis", tone: "text-brand-cyan" },
  watcher_digest: { icon: Radar, label: "Market watch", tone: "text-brand-violet" },
  competitor: { icon: Target, label: "Competitor", tone: "text-warning" },
  pivot: { icon: GitBranch, label: "Pivot", tone: "text-success" },
}

const SUGGESTIONS = [
  "Who are my biggest competitors and what are their weaknesses?",
  "What is the single riskiest assumption in my idea?",
  "Should I pivot, and why?",
  "What should I build first for my MVP?",
]

export default function AskPage() {
  const params = useParams()
  const ideaId = params?.id as string

  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState("")
  const [asking, setAsking] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await apiFetch(`/ideas/${ideaId}/rag-status`)
        setStatus(res.data)
      } catch (err) {
        console.error("Failed to load RAG status:", err)
      }
    }
    if (ideaId) loadStatus()
  }, [ideaId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns, asking])

  async function ask(q: string) {
    const text = q.trim()
    if (!text || asking) return

    setTurns((t) => [...t, { role: "user", text }])
    setQuestion("")
    setAsking(true)

    try {
      const res = await apiFetch(`/ideas/${ideaId}/ask`, {
        method: "POST",
        body: JSON.stringify({ question: text }),
      })
      const d = res.data
      setTurns((t) => [...t, {
        role: "assistant",
        text: d.answer,
        sources: d.sources || [],
        grounded: d.grounded,
      }])
      if (d.quota) {
        setStatus((s: any) => ({ ...(s || {}), quota: { ...(s?.quota || {}), ...d.quota } }))
      }
    } catch (err: any) {
      // A 402 is handled globally by CreditGuard; only surface other failures.
      if (err?.status !== 402) {
        toast.error(err?.message || "Couldn't answer that. Try again.")
      }
      setTurns((t) => t.slice(0, -1))
      setQuestion(text)
    } finally {
      setAsking(false)
    }
  }

  async function reindex() {
    setIndexing(true)
    try {
      const res = await apiFetch(`/ideas/${ideaId}/reindex`, { method: "POST" })
      toast.success(`Indexed ${res.data.chunks} pieces of context`)
      const s = await apiFetch(`/ideas/${ideaId}/rag-status`)
      setStatus(s.data)
    } catch (err: any) {
      toast.error(err?.message || "Could not rebuild the index")
    } finally {
      setIndexing(false)
    }
  }

  const quota = status?.quota

  return (
    <div className="max-w-4xl mx-auto animate-fade-up flex flex-col h-[calc(100vh-8.5rem)]">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 shrink-0">
        <div className="min-w-0">
          <p className="eyebrow mb-2.5">Ask anything</p>
          <h1 className="text-[1.6rem] sm:text-3xl font-semibold tracking-[-0.03em] leading-tight text-gradient-subtle">
            Ask your <span className="accent-serif text-gradient">analysis</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Every answer comes from your own research — your stages, market digests,
            competitors, and pivot assessments. Nothing invented.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {quota && (
            <div className="text-right">
              <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60">
                Today
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {quota.used ?? 0}
                <span className="text-muted-foreground/60">/{quota.limit ?? 0}</span>
              </p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={reindex}
            disabled={indexing}
            className="h-10 rounded-xl gap-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
          >
            {indexing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Reindex
          </Button>
        </div>
      </header>

      {/* ── Conversation ───────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 rounded-2xl card-premium flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {turns.length === 0 && !asking && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                <Sparkles className="h-6 w-6 text-brand-cyan" />
              </div>
              <p className="text-base font-semibold">Ask about your startup</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
                {status?.indexed
                  ? `${status.chunks} pieces of your analysis are searchable.`
                  : "Your analysis will be indexed on your first question."}
              </p>

              <div className="mt-7 grid sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-left text-[13px] leading-relaxed px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] hover:border-brand/25 text-foreground/80 hover:text-foreground transition-all duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {turns.map((turn, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn("flex gap-3", turn.role === "user" ? "justify-end" : "justify-start")}
              >
                {turn.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full shrink-0 bg-gradient-to-br from-brand to-brand-violet flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={cn("max-w-[85%] min-w-0", turn.role === "user" && "order-first")}>
                  <div
                    className={cn(
                      "px-4 py-3 rounded-xl text-[13.5px] leading-relaxed",
                      turn.role === "user"
                        ? "bg-brand/90 text-white rounded-tr-sm"
                        : "bg-white/[0.05] border border-white/[0.06] text-foreground/90 rounded-tl-sm"
                    )}
                  >
                    {turn.text}
                  </div>

                  {turn.role === "assistant" && turn.sources && turn.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {turn.sources.map((s, j) => {
                        const meta = SOURCE_META[s.type] || SOURCE_META.stage_result
                        const Icon = meta.icon
                        return (
                          <span
                            key={j}
                            title={`${s.title} · relevance ${s.score}`}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] font-medium text-muted-foreground"
                          >
                            <Icon className={cn("h-3 w-3", meta.tone)} />
                            {meta.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {turn.role === "user" && (
                  <div className="h-8 w-8 rounded-full shrink-0 bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {asking && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full shrink-0 bg-gradient-to-br from-brand to-brand-violet flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-xl rounded-tl-sm bg-white/[0.05] border border-white/[0.06] flex items-center gap-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                Searching your analysis…
              </div>
            </div>
          )}
        </div>

        {/* ── Composer ─────────────────────────────────────── */}
        <div className="shrink-0 p-3.5 border-t border-white/[0.06] bg-white/[0.02]">
          <form
            onSubmit={(e) => { e.preventDefault(); ask(question) }}
            className="flex items-center gap-2.5"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your startup…"
              disabled={asking}
              className="flex-1 h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-60"
            />
            <Button
              type="submit"
              disabled={!question.trim() || asking}
              className="h-11 w-11 p-0 rounded-xl bg-primary hover:bg-primary/90 glow-primary press shrink-0"
              aria-label="Send question"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {status?.indexed && (
            <p className="mt-2.5 px-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/50">
              <Database className="h-3 w-3" />
              {status.chunks} sources indexed
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
