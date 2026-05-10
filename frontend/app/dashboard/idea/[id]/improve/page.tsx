"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
      <div className="flex flex-col h-[70vh] items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
          <div className="relative h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-violet-500 animate-pulse" />
          </div>
        </div>
        <p className="font-semibold text-foreground">Starting Improvement Session…</p>
        <p className="text-sm text-muted-foreground">AI is analyzing your idea&apos;s weaknesses</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-center">
        <p className="text-destructive font-semibold">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/dashboard/idea/${ideaId}/validation`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">AI Improvement Mode</h1>
              <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                <Sparkles className="h-3 w-3 mr-1" /> Layers Engine
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Answer questions to refine your idea and earn the AI-Refined badge</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground">Improvement Progress</span>
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Chat messages */}
      <div className="space-y-4 mb-6 min-h-[40vh]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "ai" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-violet-500" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              )}
            >
              {msg.role === "ai" && msg.layer_label && (
                <Badge variant="outline" className="text-[10px] mb-2 font-semibold text-violet-600 border-violet-500/20">
                  {msg.layer_label}
                </Badge>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-violet-500" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Complete state — Finalize button */}
      {isComplete ? (
        <Card className="border-2 border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-6 text-center space-y-4">
            <Trophy className="h-10 w-10 text-violet-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-foreground">Improvement Session Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Apply these improvements to update your idea and earn the <strong>AI-Refined ✓</strong> badge.
              </p>
            </div>
            <Button
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {isFinalizing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Applying Improvements...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Apply Improvements &amp; Earn Badge</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Input area */
        <div className="flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            className="min-h-[48px] max-h-[120px] resize-none rounded-xl"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 rounded-xl shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
