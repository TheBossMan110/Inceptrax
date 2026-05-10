"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Shield, ShieldAlert, AlertTriangle, CheckCircle2,
  Flame, Skull, Heart, RefreshCw, HelpCircle, ChevronDown, ChevronUp,
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
    A: "text-green-600 bg-green-500/10 border-green-500/30",
    B: "text-blue-600 bg-blue-500/10 border-blue-500/30",
    C: "text-amber-600 bg-amber-500/10 border-amber-500/30",
    D: "text-orange-600 bg-orange-500/10 border-orange-500/30",
    F: "text-red-600 bg-red-500/10 border-red-500/30",
  }

  const probColor: Record<string, string> = {
    High: "bg-red-500/10 text-red-600 border-red-500/20",
    Medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Low: "bg-green-500/10 text-green-600 border-green-500/20",
  }

  // Initial state — show start button
  if (!data && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] gap-6 text-center max-w-lg mx-auto">
        <div className="h-20 w-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Stress Test</h1>
          <p className="text-muted-foreground mt-2">
            Let our AI play devil&apos;s advocate. It will find every weakness, ask the toughest investor questions,
            and identify scenarios that could kill your idea — then tell you how to survive.
          </p>
        </div>
        <Button onClick={runTest} size="lg" className="gap-2 bg-red-600 hover:bg-red-700 text-white px-8">
          <Flame className="h-5 w-5" /> Start Stress Test
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <div className="relative h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
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
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-bold">{error}</p>
        <Button onClick={runTest} className="gap-2"><RefreshCw className="h-4 w-4" /> Retry</Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <Badge className="bg-red-500/10 text-red-600 border-none mb-2"><ShieldAlert className="h-3 w-3 mr-1" /> Stress Test</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Stress Test Results</h1>
      </div>

      {/* Score Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="text-center">
            <div className={cn(
              "inline-flex items-center justify-center w-24 h-24 rounded-2xl text-5xl font-black border-2",
              gradeColor[data.stress_grade] || gradeColor.C
            )}>
              {data.stress_grade}
            </div>
            <p className="text-sm text-muted-foreground mt-2">{data.stress_score}/100 resilience</p>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-2">Final Verdict</h2>
            <p className="text-foreground leading-relaxed">{data.final_verdict}</p>
          </div>
          <Button onClick={runTest} variant="outline" size="sm" className="gap-2 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" /> Re-test
          </Button>
        </CardContent>
      </Card>

      {/* Devil's Advocate Questions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><HelpCircle className="h-5 w-5 text-red-500" /> Devil&apos;s Advocate Questions</h2>
        {data.devil_questions.map((dq, i) => (
          <Card key={i} className="overflow-hidden">
            <button
              className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedQ(expandedQ === i ? null : i)}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="h-7 w-7 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-red-600">{i + 1}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{dq.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">{dq.why_it_matters}</p>
                </div>
              </div>
              {expandedQ === i ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
            {expandedQ === i && (
              <div className="px-4 pb-4 pt-0 ml-10 border-t border-border/50">
                <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">💡 Suggested Answer:</p>
                  <p className="text-sm text-green-600 dark:text-green-400/80">{dq.suggested_answer}</p>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Worst Case Scenarios */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Worst-Case Scenarios</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.worst_case_scenarios.map((wc, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">{wc.scenario}</h3>
                  <Badge variant="outline" className={cn("text-[10px] shrink-0 ml-2", probColor[wc.probability] || "")}>
                    {wc.probability} risk
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground"><strong>Mitigation:</strong> {wc.mitigation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Kill Scenarios */}
        <Card className="border-red-500/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-600 text-base"><Skull className="h-5 w-5" /> Idea Killers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.kill_scenarios.map((k, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Skull className="h-3.5 w-3.5 text-red-500 shrink-0 mt-1" />
                <span className="text-foreground">{k}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Survival Tips */}
        <Card className="border-green-500/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-green-600 text-base"><Heart className="h-5 w-5" /> Survival Tips</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.survival_tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-1" />
                <span className="text-foreground">{t}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
