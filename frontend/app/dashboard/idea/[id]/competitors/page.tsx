"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ShieldAlert, Zap, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    )
  }

  if (!idea || !idea.analysis_data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Competitor Analysis not found</h2>
      </div>
    )
  }

  const competitors = idea.analysis_data?.competitors || []

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex flex-wrap items-center gap-3">
            Competitor Analysis
            <Link href={`/dashboard/idea/${params.id}/competitor-watch`} className="inline-block">
              <Button variant="outline" size="sm" className="gap-2 h-7 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5 fill-indigo-500" />
                Live Watch
              </Button>
            </Link>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Analysis of key competitors, their strengths, weaknesses, and potential threats to your success.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {(competitors || []).map((comp: any, i: number) => (
          <Card
            key={comp.name}
            className="border border-border shadow-sm bg-card overflow-hidden"
          >
            <CardContent className="p-6 space-y-6 overflow-hidden">
              {/* HEADER */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold break-words">{comp.name || "Unknown Competitor"}</h3>
                    <Badge variant={comp.type === "Direct" ? "default" : "secondary"}>
                      {comp.type || "N/A"}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Threat Level: </span>
                    <span
                      className={
                        (comp.threat === "High" || comp.threat === "Medium")
                          ? "text-destructive font-bold"
                          : "text-amber-500 font-bold"
                      }
                    >
                      {comp.threat}
                    </span>
                  </div>
                </div>
              </div>

              {/* STRENGTHS & WEAKNESSES */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                    Strengths
                  </h4>

                  <ul className="space-y-3">
                    {(comp.strengths || []).map((s: string, j: number) => (
                      <li key={j} className="flex gap-3 items-start text-sm text-muted-foreground">
                        <span className="mt-2 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <span className="min-w-0 break-words leading-relaxed" style={{ overflowWrap: 'anywhere' }}>{s}</span>
                      </li>
                    ))}
                    {(!comp.strengths || comp.strengths.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">No strengths listed.</li>
                    )}
                  </ul>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                    Weaknesses
                  </h4>

                  <ul className="space-y-3">
                    {(comp.weaknesses || []).map((w: string, j: number) => (
                      <li key={j} className="flex gap-3 items-start text-sm text-muted-foreground">
                        <span className="mt-2 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="min-w-0 break-words leading-relaxed" style={{ overflowWrap: 'anywhere' }}>{w}</span>
                      </li>
                    ))}
                    {(!comp.weaknesses || comp.weaknesses.length === 0) && (
                      <li className="text-sm text-muted-foreground italic">No weaknesses listed.</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!competitors || competitors.length === 0) && (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
            No competitor data available.
          </div>
        )}
      </div>

      {/* EDGE */}
      <Card className="border-none shadow-sm bg-secondary text-secondary-foreground overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" /> Your Competitive Edge
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <p className="leading-relaxed font-medium break-words" style={{ overflowWrap: 'anywhere' }}>
            Based on the analysis of {(competitors || []).length} competitors, your
            unique advantage lies in the specific solution proposed for{" "}
            {idea.title}.
          </p>
        </CardContent>
      </Card>


      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
        <Link href={`/dashboard/idea/${params.id}/market`} className="w-full sm:w-auto">
          <Button variant="outline" className="gap-2 w-full" size="lg">
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
        </Link>
        <Link href={`/dashboard/idea/${params.id}/monetization`} className="w-full sm:w-auto">
          <Button className="gap-2 w-full" size="lg">
            Next: Monetization <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div >
  )
}
