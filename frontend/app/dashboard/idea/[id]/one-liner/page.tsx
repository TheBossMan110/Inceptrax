"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Mic, Copy, Check, RefreshCw, Twitter, Briefcase, TrendingUp,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PitchItem {
  format: string
  template: string
  pitch: string
  use_case: string
}

interface PitchData {
  pitches: PitchItem[]
}

const PITCH_ICONS: Record<string, any> = {
  "Twitter Pitch": Twitter,
  "Elevator Pitch": Briefcase,
  "Investor Hook": TrendingUp,
}

const PITCH_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Twitter Pitch":  { bg: "bg-sky-500/10",    border: "border-sky-500/30",    text: "text-sky-600" },
  "Elevator Pitch": { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-600" },
  "Investor Hook":  { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600" },
}

export default function OneLinerPage() {
  const params = useParams()
  const [data, setData] = useState<PitchData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const generate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/ideas/${params.id}/one-liner`, { method: "POST" })
      setData(res.data)
    } catch (err: any) {
      setError(err.message || "Failed to generate pitches")
    } finally {
      setIsLoading(false)
    }
  }

  const copyPitch = async (pitch: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(pitch)
      setCopiedIdx(idx)
      toast.success("Pitch copied!")
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  // Initial state
  if (!data && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] gap-6 text-center max-w-lg mx-auto">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mic className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">One-Line Pitch Formula</h1>
          <p className="text-muted-foreground mt-2">
            Generate 3 ready-to-use pitch formats for any situation — Twitter, elevator,
            and investor meetings. Copy, paste, and pitch with confidence.
          </p>
        </div>
        <Button onClick={generate} size="lg" className="gap-2 px-8">
          <Mic className="h-5 w-5" /> Generate Pitches
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <p className="font-semibold">Crafting your pitches…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <p className="text-lg font-bold text-destructive">{error}</p>
        <Button onClick={generate} className="gap-2"><RefreshCw className="h-4 w-4" /> Retry</Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <div>
          <Badge className="bg-primary/10 text-primary border-none mb-2"><Mic className="h-3 w-3 mr-1" /> One-Line Pitch</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Your Pitch Formulas</h1>
          <p className="text-muted-foreground mt-1">3 formats, ready to copy and use anywhere</p>
        </div>
        <Button onClick={generate} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
      </div>

      <div className="space-y-6">
        {data.pitches.map((p, i) => {
          const Icon = PITCH_ICONS[p.format] || Mic
          const colors = PITCH_COLORS[p.format] || PITCH_COLORS["Twitter Pitch"]

          return (
            <Card key={i} className={cn("border-2 overflow-hidden", colors.border)}>
              <CardContent className="p-0">
                {/* Header */}
                <div className={cn("px-6 py-4 flex items-center justify-between", colors.bg)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-white/50 dark:bg-black/20", colors.text)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-lg", colors.text)}>{p.format}</h3>
                      <p className="text-xs text-muted-foreground">{p.use_case}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => copyPitch(p.pitch, i)}
                  >
                    {copiedIdx === i ? (
                      <><Check className="h-3.5 w-3.5 text-green-600" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </Button>
                </div>

                {/* Pitch */}
                <div className="px-6 py-5">
                  <blockquote className="text-lg font-medium text-foreground leading-relaxed border-l-4 border-primary/30 pl-4">
                    &ldquo;{p.pitch}&rdquo;
                  </blockquote>
                </div>

                {/* Template */}
                <div className="px-6 pb-5">
                  <p className="text-xs text-muted-foreground">
                    <strong>Template: </strong>
                    <span className="italic">{p.template}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
