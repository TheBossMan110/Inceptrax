"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Mic, Copy, Check, RefreshCw, Twitter, Briefcase, TrendingUp,
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

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

const PITCH_ICONS: Record<string, any> = {
  "Twitter Pitch": Twitter,
  "Elevator Pitch": Briefcase,
  "Investor Hook": TrendingUp,
}

const PITCH_COLORS: Record<string, { bg: string; chip: string; text: string }> = {
  "Twitter Pitch":  { bg: "bg-brand-cyan/[0.06]",   chip: "from-brand-cyan/25 to-brand/15 border-brand-cyan/25",        text: "text-brand-cyan" },
  "Elevator Pitch": { bg: "bg-brand-violet/[0.06]", chip: "from-brand-violet/25 to-brand-fuchsia/15 border-brand-violet/25", text: "text-brand-violet" },
  "Investor Hook":  { bg: "bg-success/[0.06]",      chip: "from-success/25 to-success/10 border-success/25",            text: "text-success" },
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
      <div className="max-w-lg mx-auto py-10 animate-fade-up">
        <div className="card-premium rounded-2xl py-16 px-8 text-center flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-brand/25 blur-xl animate-pulse-glow" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/25 flex items-center justify-center">
              <Mic className="h-10 w-10 text-brand-cyan" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-3">Pitch Generator</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">One-Line Pitch Formula</h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Generate 3 ready-to-use pitch formats for any situation — Twitter, elevator,
              and investor meetings. Copy, paste, and pitch with confidence.
            </p>
          </div>
          <Button onClick={generate} size="lg" className="gap-2 px-8 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press">
            <Mic className="h-5 w-5" /> Generate Pitches
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-brand/25 blur-xl animate-pulse-glow" />
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/25 flex items-center justify-center">
            <Mic className="h-6 w-6 text-brand-cyan" />
          </div>
        </div>
        <p className="font-semibold">Crafting your pitches…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <p className="text-lg font-semibold text-danger">{error}</p>
        <Button onClick={generate} className="gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary press">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-brand-cyan mb-3">
            <Mic className="h-3 w-3" /> One-Line Pitch
          </span>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">Your Pitch Formulas</h1>
          <p className="text-muted-foreground mt-1 text-sm">3 formats, ready to copy and use anywhere</p>
        </div>
        <Button onClick={generate} variant="outline" size="sm" className="gap-2 shrink-0 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
      </div>

      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-6">
        {data.pitches.map((p, i) => {
          const Icon = PITCH_ICONS[p.format] || Mic
          const colors = PITCH_COLORS[p.format] || PITCH_COLORS["Twitter Pitch"]

          return (
            <motion.div key={i} variants={itemVariants} className="card-premium card-premium-hover rounded-2xl overflow-hidden">
              {/* Header */}
              <div className={cn("px-6 py-4 flex items-center justify-between gap-3 border-b border-white/[0.06]", colors.bg)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br border flex items-center justify-center shrink-0", colors.chip)}>
                    <Icon className={cn("h-5 w-5", colors.text)} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn("font-semibold text-lg tracking-tight", colors.text)}>{p.format}</h3>
                    <p className="text-xs text-muted-foreground truncate">{p.use_case}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 rounded-xl shrink-0 press",
                    copiedIdx === i
                      ? "text-success border-success/40 bg-success/10 hover:bg-success/10 hover:text-success"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  )}
                  onClick={() => copyPitch(p.pitch, i)}
                >
                  {copiedIdx === i ? (
                    <><Check className="h-3.5 w-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </Button>
              </div>

              {/* Pitch */}
              <div className="px-6 py-5">
                <blockquote className="text-lg text-foreground/95 leading-relaxed border-l-2 border-brand/40 pl-4 accent-serif">
                  &ldquo;{p.pitch}&rdquo;
                </blockquote>
              </div>

              {/* Template */}
              <div className="px-6 pb-5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono uppercase tracking-[0.14em] text-muted-foreground/70">Template: </span>
                  <span className="italic">{p.template}</span>
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
