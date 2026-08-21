"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Sparkles,
  Send,
  CheckCircle2,
  ArrowLeft,
  Zap,
  MessageCircle,
  Trophy,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface LayerResponse {
  layer: string
  layer_label: string
  question: string
  progress_pct: number
  is_ready: boolean
}

interface Message {
  role: "ai" | "user"
  content: string
  layer?: string
  layer_label?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export default function ImprovePage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(true)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Start improvement session
  useEffect(() => {
    async function startSession() {
      try {
        const res = await apiFetch(`/ideas/${ideaId}/layers/improve/start`, { method: "POST" })
        const data: LayerResponse = res.data
        setMessages([{
          role: "ai",
          content: data.question,
          layer: data.layer,
          layer_label: data.layer_label,
        }])
        setHistory([data.question])
        setProgress(data.progress_pct)
      } catch (err: any) {
        setError(err.message || "Failed to start improvement session")
      } finally {
        setIsStarting(false)
      }
    }
    startSession()
  }, [ideaId])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])

    const newHistory = [...history, userMsg]
    setHistory(newHistory)
    setIsLoading(true)

    try {
      const res = await apiFetch(`/ideas/${ideaId}/layers/improve/chat`, {
        method: "POST",
        body: JSON.stringify({ history: newHistory }),
      })
      const data: LayerResponse = res.data

      setMessages(prev => [...prev, {
        role: "ai",
        content: data.question,
        layer: data.layer,
        layer_label: data.layer_label,
      }])
      setHistory(prev => [...prev, data.question])
      setProgress(data.progress_pct)

      if (data.is_ready) {
        setIsComplete(true)
      }
    } catch (err: any) {
      setError(err.message || "Failed to get next question")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalize = async () => {
    setIsFinalizing(true)
    try {
      await apiFetch(`/ideas/${ideaId}/layers/improve/finalize`, {
        method: "POST",
        body: JSON.stringify({ history }),
      })
      // Redirect back to validation page
      router.push(`/dashboard/idea/${ideaId}/validation`)
    } catch (err: any) {
      setError(err.message || "Failed to finalize improvements")
    } finally {
      setIsFinalizing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isStarting) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-brand-violet/25 blur-xl animate-pulse-glow" />
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/25 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-brand-violet" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Starting Improvement Session…</p>
          <p className="text-sm text-muted-foreground mt-1">AI is analyzing your idea&apos;s weaknesses</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-center">
        <p className="text-danger font-semibold">{error}</p>
        <Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/[0.06] press"
            onClick={() => router.push(`/dashboard/idea/${ideaId}/validation`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-gradient-subtle">AI Improvement Mode</h1>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full bg-brand-violet/10 text-brand-violet border border-brand-violet/25">
                <Sparkles className="h-3 w-3" /> Layers Engine
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Answer questions to refine your idea and earn the AI-Refined badge</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Improvement Progress</span>
          <span className="text-xs font-bold tabular-nums text-brand-cyan">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: EASE }}
          />
        </div>
      </div>

      {/* Chat messages */}
      <div className="space-y-4 mb-6 min-h-[40vh]">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "ai" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/25 flex items-center justify-center">
                <Zap className="h-4 w-4 text-brand-violet" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "glass"
              )}
            >
              {msg.role === "ai" && msg.layer_label && (
                <span className="inline-block text-[10px] font-mono uppercase tracking-[0.12em] font-semibold text-brand-violet border border-brand-violet/25 bg-brand-violet/10 rounded-full px-2 py-0.5 mb-2">
                  {msg.layer_label}
                </span>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-brand/15 border border-brand/25 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-brand-cyan" />
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/25 flex items-center justify-center">
              <Zap className="h-4 w-4 text-brand-violet" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-brand-cyan/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand-violet/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Complete state — Finalize button */}
      {isComplete ? (
        <div className="relative rounded-2xl border-gradient p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/25 flex items-center justify-center">
            <Trophy className="h-7 w-7 text-brand-violet" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Improvement Session <span className="accent-serif text-gradient">Complete</span></h3>
            <p className="text-sm text-muted-foreground mt-1">
              Apply these improvements to update your idea and earn the <strong className="text-foreground">AI-Refined</strong> badge.
            </p>
          </div>
          <Button
            onClick={handleFinalize}
            disabled={isFinalizing}
            className="gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
          >
            {isFinalizing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Applying Improvements...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Apply Improvements &amp; Earn Badge</>
            )}
          </Button>
        </div>
      ) : (
        /* Input area */
        <div className="flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            className="min-h-[48px] max-h-[120px] resize-none rounded-xl bg-white/[0.03] border-white/10 focus-visible:border-brand/40"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0 bg-primary hover:bg-primary/90 glow-primary press"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
