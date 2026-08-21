"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ShieldCheck, ShieldAlert, Zap, ArrowLeft, ArrowRight, AlertCircle, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

function threatBadge(threat: string) {
  if (threat === "High") return "bg-danger/10 text-danger border border-danger/25"
  if (threat === "Medium") return "bg-warning/10 text-warning border border-warning/25"
  return "bg-success/10 text-success border border-success/25"
}

export default function CompetitorAnalysisPage() {
  const params = useParams()
  const [idea, setIdea] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchIdea() {
      try {
        const response = await apiFetch(`/ideas/${params.id}`)
        setIdea(response.data.idea)
      } catch (error) {
        console.error("Failed to fetch idea:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchIdea()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="space-y-3">
          <div className="skeleton h-8 w-72" />
          <div className="skeleton h-4 w-full max-w-xl" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-56 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!idea || !idea.analysis_data) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <div className="card-premium rounded-2xl py-16 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
            <AlertCircle className="h-6 w-6 text-brand-cyan" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Competitor Analysis not found</h2>
        </div>
      </div>
    )
  }

  const competitors = idea.analysis_data?.competitors || []

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow mb-2">Stage 03 — Competition</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex flex-wrap items-center gap-3">
            <span className="text-gradient-subtle">Competitor Analysis</span>
            <Link href={`/dashboard/idea/${params.id}/competitor-watch`} className="inline-block">
              <Button variant="outline" size="sm" className="gap-2 h-7 rounded-full border-brand/25 bg-brand/10 text-brand-cyan hover:bg-brand/20 hover:text-brand-cyan text-[10px] font-bold uppercase tracking-wider press">
                <Zap className="h-3.5 w-3.5" />
                Live Watch
              </Button>
            </Link>
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Analysis of key competitors, their strengths, weaknesses, and potential threats to your success.
          </p>
        </div>
      </div>

      <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-6">
        {(competitors || []).map((comp: any, i: number) => (
          <motion.div
            key={comp.name}
            variants={itemVariants}
            className="card-premium card-premium-hover rounded-2xl overflow-hidden"
          >
            <div className="p-6 space-y-6 overflow-hidden">
              {/* HEADER */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
                      <Swords className="h-4 w-4 text-brand-cyan" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold tracking-tight break-words">{comp.name || "Unknown Competitor"}</h3>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        comp.type === "Direct"
                          ? "bg-brand/15 text-brand-cyan border border-brand/25"
                          : "bg-white/[0.05] text-muted-foreground border border-white/10"
                      )}
                    >
                      {comp.type || "N/A"}
                    </span>
                  </div>
                  <div className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">Threat Level:</span>
                    <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", threatBadge(comp.threat))}>
                      {comp.threat}
                    </span>
                  </div>
                </div>
              </div>

              {/* STRENGTHS & WEAKNESSES */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="min-w-0">
                  <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                    Strengths
                  </h4>

                  <ul className="space-y-3">
                    {(comp.strengths || []).map((s: string, j: number) => (
                      <li key={j} className="flex gap-3 items-start text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                        <span className="min-w-0 break-words leading-relaxed" style={{ overflowWrap: 'anywhere' }}>{s}</span>
                      </li>
                    ))}
                    {(!comp.strengths || comp.strengths.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">No strengths listed.</li>
                    )}
                  </ul>
                </div>

                <div className="min-w-0">
                  <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4 text-warning shrink-0" />
                    Weaknesses
                  </h4>

                  <ul className="space-y-3">
                    {(comp.weaknesses || []).map((w: string, j: number) => (
                      <li key={j} className="flex gap-3 items-start text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                        <span className="min-w-0 break-words leading-relaxed" style={{ overflowWrap: 'anywhere' }}>{w}</span>
                      </li>
                    ))}
                    {(!comp.weaknesses || comp.weaknesses.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">No weaknesses listed.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {(!competitors || competitors.length === 0) && (
          <div className="card-premium rounded-2xl py-16 px-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
              <Swords className="h-6 w-6 text-brand-cyan" />
            </div>
            <p className="font-semibold">No competitor data available</p>
            <p className="text-sm text-muted-foreground mt-1">Run the analysis to map your competitive landscape.</p>
          </div>
        )}
      </motion.div>

      {/* EDGE */}
      <div className="relative rounded-2xl border-gradient p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-brand-cyan" />
          </div>
          <h2 className="font-semibold text-base">Your Competitive <span className="accent-serif text-gradient">Edge</span></h2>
        </div>
        <p className="leading-relaxed text-sm text-foreground/90 break-words" style={{ overflowWrap: 'anywhere' }}>
          Based on the analysis of {(competitors || []).length} competitors, your
          unique advantage lies in the specific solution proposed for{" "}
          {idea.title}.
        </p>
      </div>


      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
        <Link href={`/dashboard/idea/${params.id}/market`} className="w-full sm:w-auto">
          <Button variant="outline" className="gap-2 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" size="lg">
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
        </Link>
        <Link href={`/dashboard/idea/${params.id}/monetization`} className="w-full sm:w-auto">
          <Button className="gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press" size="lg">
            Next: Monetization <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
