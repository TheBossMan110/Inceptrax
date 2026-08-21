"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Loader2, Briefcase, Copy, Download, Check, AlertCircle, Sparkles, FileText } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Pitch {
  format: string
  style: string
  pitch: string
  hook: string
  key_stat: string
  // Legacy fields (backward compat)
  full_pitch?: string
  problem?: string
  solution?: string
  traction_market?: string
  ask?: string
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

const STYLE_ACCENTS: Record<string, string> = {
  "The Classic": "text-brand-cyan",
  "The Problem First": "text-brand-fuchsia",
  "The Traction First": "text-success",
}

const STYLE_BADGES: Record<string, string> = {
  "A": "bg-brand/15 text-brand-cyan border-brand/25",
  "B": "bg-brand-fuchsia/10 text-brand-fuchsia border-brand-fuchsia/25",
  "C": "bg-success/10 text-success border-success/25",
}

export default function InvestorPage() {
  const params = useParams()
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [downloadingPPT, setDownloadingPPT] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    async function fetchPitches() {
      try {
        const response = await apiFetch(`/ideas/${params.id}/investor-pitch`, {
          method: 'POST'
        });
        if (response.data && response.data.pitches) {
          setPitches(response.data.pitches);
        } else {
          setError("Failed to generate pitches.");
        }
      } catch (err: any) {
        console.error("Failed to fetch pitches:", err)
        setError(err.message || "Failed to load investor pitches.");
      } finally {
        setIsLoading(false)
      }
    }
    fetchPitches()
  }, [params.id])

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  const handleDownload = async (type: 'ppt' | 'pdf') => {
    const setDownloading = type === 'ppt' ? setDownloadingPPT : setDownloadingPDF
    const endpoint = type === 'ppt' ? 'download-ppt' : 'download'
    const ext = type === 'ppt' ? 'pptx' : 'pdf'

    setDownloading(true)
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ideas/${params.id}/${endpoint}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `idea-${params.id}-presentation.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(`Failed to download ${type}`, err);
      toast.error(`Failed to generate ${type.toUpperCase()}.`);
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-brand/20 blur-xl animate-pulse-glow" />
          <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/25 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-brand-cyan" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Generating Investor Pitches</p>
          <p className="text-sm text-muted-foreground mt-1">Crafting 3 pitch formulas from your analysis data...</p>
        </div>
        <div className="w-full max-w-2xl space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || pitches.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <div className="card-premium rounded-2xl py-16 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center mb-5">
            <AlertCircle className="h-6 w-6 text-danger" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Pitch Generation Failed</h2>
          <p className="text-sm text-muted-foreground mt-2">{error || "Could not generate investor pitches."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-brand-cyan">
              <Briefcase className="h-3 w-3" />
              Investor Ready
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">Investor Pitches</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            3 proven pitch formulas tailored to your idea. Copy, customize, and pitch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Button
            onClick={() => handleDownload('pdf')}
            className="gap-2 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
            variant="outline"
            disabled={downloadingPDF}
          >
            {downloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF Report
          </Button>
          <Button
            onClick={() => handleDownload('ppt')}
            className="gap-2 rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
            variant="default"
            disabled={downloadingPPT}
          >
            {downloadingPPT ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Pitch Deck (PPTX)
          </Button>
        </div>
      </div>

      {/* Pitch Cards */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-6">
        {pitches.map((pitch, index) => {
          const pitchText = pitch.pitch || pitch.full_pitch || ""
          const format = pitch.format || String.fromCharCode(65 + index)  // A, B, C
          const style = pitch.style || "Standard Pitch"
          const accentClass = STYLE_ACCENTS[style] || "text-brand-cyan"
          const badgeClass = STYLE_BADGES[format] || "bg-white/[0.05] text-muted-foreground border-white/10"

          return (
            <motion.div key={index} variants={itemVariants} className="card-premium card-premium-hover rounded-2xl overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full border font-mono", badgeClass)}>
                        Formula {format}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{style}</span>
                    </div>
                    <h3 className={cn("text-lg font-semibold tracking-tight", accentClass)}>{style}</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-2 rounded-xl transition-all shrink-0 press",
                      copiedIndex === index
                        ? "text-success border-success/40 bg-success/10 hover:bg-success/10 hover:text-success"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    )}
                    onClick={() => copyToClipboard(pitchText, index)}
                  >
                    {copiedIndex === index ? (
                      <><Check className="h-4 w-4" /> Copied</>
                    ) : (
                      <><Copy className="h-4 w-4" /> Copy</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* The Pitch */}
                <div className="glass rounded-xl p-5">
                  <p className="text-foreground/90 leading-relaxed text-[15px]">
                    &ldquo;{pitchText}&rdquo;
                  </p>
                </div>

                {/* Hook + Key Stat */}
                <div className="grid md:grid-cols-2 gap-4">
                  {pitch.hook && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-brand-cyan" /> Opening Hook
                      </h4>
                      <p className="text-sm text-foreground/90 accent-serif p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        &ldquo;{pitch.hook}&rdquo;
                      </p>
                    </div>
                  )}
                  {pitch.key_stat && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">Key Statistic</h4>
                      <p className="text-sm text-foreground font-medium tabular-nums p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        {pitch.key_stat}
                      </p>
                    </div>
                  )}
                </div>

                {/* Legacy fields for backward compat */}
                {(pitch.problem || pitch.solution) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {pitch.problem && (
                      <div>
                        <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5">The Problem</h4>
                        <p className="text-sm text-foreground/90 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">{pitch.problem}</p>
                      </div>
                    )}
                    {pitch.solution && (
                      <div>
                        <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5">The Solution</h4>
                        <p className="text-sm text-foreground/90 p-3.5 rounded-xl bg-brand/[0.06] border border-brand/20">{pitch.solution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
