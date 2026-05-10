"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2, UserCheck, AlertTriangle, CheckCircle2, ArrowRight,
  Users, Lightbulb, Target, RefreshCw,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface MatchData {
  match_score: number
  verdict: string
  strengths: string[]
  gaps: string[]
  recommended_cofounder: string
  advice: string
}

export default function FounderMatchPage() {
  const params = useParams()
  const [data, setData] = useState<MatchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/ideas/${params.id}/founder-match`, { method: "POST" })
      setData(res.data)
    } catch (err: any) {
      setError(err.message || "Failed to generate match score")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchMatch() }, [params.id])

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <div className="relative h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-blue-500 animate-pulse" />
          </div>
        </div>
        <p className="font-semibold text-foreground">Analyzing Founder-Idea Fit…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-bold">{error || "Failed"}</p>
        <Button onClick={fetchMatch} className="gap-2"><RefreshCw className="h-4 w-4" /> Try Again</Button>
      </div>
    )
  }

  const scoreColor = data.match_score >= 75 ? "text-green-600" : data.match_score >= 50 ? "text-amber-600" : "text-red-600"

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <Badge className="bg-blue-500/10 text-blue-600 border-none mb-2"><UserCheck className="h-3 w-3 mr-1" /> Founder Match</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Founder-Idea Match Score</h1>
        <p className="text-muted-foreground mt-1">How well do your skills align with this idea?</p>
      </div>

      {/* Score Card */}
      <Card className="border-2 overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="text-center">
            <div className={cn("text-6xl font-black", scoreColor)}>{data.match_score}</div>
            <p className="text-sm text-muted-foreground mt-1">out of 100</p>
          </div>
          <div className="flex-1">
            <Badge variant="outline" className="text-sm font-semibold mb-2">{data.verdict}</Badge>
            <p className="text-foreground leading-relaxed">{data.advice}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /> Your Strengths</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gaps */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" /> Skills to Develop</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Target className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{g}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Ideal Co-Founder */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Ideal Co-Founder Profile</CardTitle></CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{data.recommended_cofounder}</p>
          <Link href="/dashboard/cofounder">
            <Button className="mt-4 gap-2"><Users className="h-4 w-4" /> Find Co-Founders <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
