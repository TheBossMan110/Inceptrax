"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const STYLE_COLORS: Record<string, string> = {
  "The Classic": "from-indigo-500/10 to-purple-500/10 border-indigo-500/20",
  "The Problem First": "from-rose-500/10 to-orange-500/10 border-rose-500/20",
  "The Traction First": "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
}

const STYLE_BADGES: Record<string, string> = {
  "A": "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  "B": "bg-rose-500/10 text-rose-600 border-rose-500/30",
  "C": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ideas/${params.id}/${endpoint}`,
        {
          method: 'GET',
          credentials: 'include',
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
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Generating Investor Pitches</p>
          <p className="text-sm text-muted-foreground mt-1">Crafting 3 pitch formulas from your analysis data...</p>
        </div>
      </div>
    )
  }

  if (error || pitches.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Pitch Generation Failed</h2>
        <p className="text-muted-foreground mt-2">{error || "Could not generate investor pitches."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
              <Briefcase className="h-3 w-3 mr-1" />
              Investor Ready
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Investor Pitches</h1>
          <p className="text-muted-foreground mt-1">
            3 proven pitch formulas tailored to your idea. Copy, customize, and pitch.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => handleDownload('pdf')}
            className="gap-2"
            variant="outline"
            disabled={downloadingPDF}
          >
            {downloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            PDF Report
          </Button>
          <Button
            onClick={() => handleDownload('ppt')}
            className="gap-2"
            variant="default"
            disabled={downloadingPPT}
          >
            {downloadingPPT ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Pitch Deck (PPTX)
          </Button>
        </div>
      </div>

      {/* Pitch Cards */}
      <div className="grid gap-6">
        {pitches.map((pitch, index) => {
          const pitchText = pitch.pitch || pitch.full_pitch || ""
          const format = pitch.format || String.fromCharCode(65 + index)  // A, B, C
          const style = pitch.style || "Standard Pitch"
          const bgClass = STYLE_COLORS[style] || "from-muted/50 to-muted/30 border-border"
          const badgeClass = STYLE_BADGES[format] || "bg-muted text-foreground"

          return (
            <Card key={index} className={cn("overflow-hidden border bg-gradient-to-br", bgClass)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs font-bold", badgeClass)}>
                        Formula {format}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">{style}</span>
                    </div>
                    <CardTitle className="text-lg">{style}</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-2 transition-all",
                      copiedIndex === index ? "text-green-500 border-green-500 bg-green-500/10" : ""
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
              </CardHeader>

              <CardContent className="space-y-5">
                {/* The Pitch */}
                <div className="bg-card/80 backdrop-blur-sm rounded-xl p-5 border border-border/50">
                  <p className="text-foreground leading-relaxed text-[15px]">
                    &ldquo;{pitchText}&rdquo;
                  </p>
                </div>

                {/* Hook + Key Stat */}
                <div className="grid md:grid-cols-2 gap-4">
                  {pitch.hook && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Opening Hook
                      </h4>
                      <p className="text-sm text-foreground italic bg-card/50 p-3 rounded-lg border border-border/30">
                        &ldquo;{pitch.hook}&rdquo;
                      </p>
                    </div>
                  )}
                  {pitch.key_stat && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Key Statistic</h4>
                      <p className="text-sm text-foreground font-medium bg-card/50 p-3 rounded-lg border border-border/30">
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
                        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1.5">The Problem</h4>
                        <p className="text-sm text-foreground bg-card/50 p-3 rounded-lg">{pitch.problem}</p>
                      </div>
                    )}
                    {pitch.solution && (
                      <div>
                        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1.5">The Solution</h4>
                        <p className="text-sm text-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">{pitch.solution}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
