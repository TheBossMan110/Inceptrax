"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Globe, Users, Loader2, ArrowRight, ArrowLeft, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { ExpandableText } from "@/components/ui/expandable-text"

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

export default function MarketResearchPage() {
  const params = useParams()
  const [idea, setIdea] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    async function fetchIdea() {
      try {
        const response = await apiFetch(`/ideas/${params.id}`)
        setIdea(response.data.idea)

        // Initialize search results from cached data if available
        if (response.data.idea.analysis_data?.market_research?.live_search) {
          setSearchResults(response.data.idea.analysis_data.market_research.live_search)
        }
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
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="skeleton h-8 w-64" />
            <div className="skeleton h-4 w-full max-w-md" />
          </div>
          <div className="skeleton h-11 w-full sm:w-52 rounded-xl" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
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
          <h2 className="text-xl font-semibold tracking-tight">Market Analysis not found</h2>
        </div>
      </div>
    )
  }

  const market = idea.analysis_data?.market_research || {}

  const handleFetchMarketData = async () => {
    setIsSearching(true)
    try {
      const response = await apiFetch(`/ideas/${idea.id}/market/research`, { method: "POST" })
      setSearchResults(response.data.market_data || [])
    } catch (error) {
      console.error("Failed to fetch market data:", error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Stage 02 — Market</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">
            Market Research
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Deep-dive into the target market for {idea.title}.
          </p>
        </div>
        <Button
          onClick={handleFetchMarketData}
          disabled={isSearching}
          className="rounded-xl gap-2 font-semibold w-full sm:w-auto h-12 sm:h-10 bg-primary hover:bg-primary/90 glow-primary shimmer press"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {(searchResults || []).length > 0 ? "Refresh Market Data" : "Fetch Live Market Data"}
        </Button>
      </div>

      {/* Live Market Insights */}
      {(searchResults || []).length > 0 && (
        <div className="relative rounded-2xl border-gradient p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
              <Globe className="h-4 w-4 text-brand-cyan" />
            </div>
            <h2 className="font-semibold text-base">Live Market Insights</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-brand-cyan">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan animate-pulse-glow" /> Live
            </span>
          </div>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(searchResults || []).map((result, i) => (
              <motion.a
                key={i}
                variants={itemVariants}
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/40 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-xs font-medium text-muted-foreground truncate">{result.source}</span>
                  <span className="text-[10px] text-muted-foreground/70 bg-white/[0.05] px-2 py-0.5 rounded-full shrink-0">{result.date}</span>
                </div>
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-brand-cyan transition-colors mb-2">
                  {result.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {result.snippet}
                </p>
              </motion.a>
            ))}
          </motion.div>
        </div>
      )}

      {/* TAM / SAM / SOM */}
      <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {["tam", "sam", "som"].map((key, i) => (
          <motion.div key={i} variants={itemVariants} className="card-premium card-premium-hover rounded-2xl p-5">
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
              {key.toUpperCase()}
            </p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight mt-1.5 text-gradient-subtle">
              {market[key] || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {key === "tam"
                ? "Total Addressable Market"
                : key === "sam"
                  ? "Serviceable Addressable Market"
                  : "Serviceable Obtainable Market"}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Trends & Segments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Key Market Trends */}
        <div className="card-premium rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-brand-cyan" />
            </div>
            <h2 className="font-semibold text-base">Key Market Trends</h2>
          </div>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-5">
            {(market.trends || []).map((trend: any, i: number) => (
              <motion.div key={i} variants={itemVariants} className="space-y-1.5 pl-4 border-l-2 border-brand/25">
                <h3 className="font-semibold text-sm text-foreground break-words">
                  {trend.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed break-words whitespace-normal">
                  <span>{trend.description} </span>
                </p>
              </motion.div>
            ))}
            {(!market.trends || market.trends.length === 0) && (
              <p className="text-sm text-muted-foreground">No trends data available.</p>
            )}
          </motion.div>
        </div>

        {/* Customer Segments */}
        <div className="card-premium rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-brand-violet" />
            </div>
            <h2 className="font-semibold text-base">Customer Segments</h2>
          </div>
          <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-4">
            {(market.segments || []).map((segment: any, i: number) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
              >
                <h3 className="font-semibold text-sm mb-1 text-foreground break-words">
                  {segment.name}
                </h3>

                <div className="text-xs text-muted-foreground mb-3 break-words whitespace-normal">
                  <ExpandableText text={segment.description} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand-cyan border border-brand/25 max-w-full whitespace-normal break-words text-center">
                    {segment.percentage} Segment
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-violet/10 text-brand-violet border border-brand-violet/25 max-w-full whitespace-normal break-words text-center">
                    {segment.wtp} WTP
                  </span>
                </div>
              </motion.div>
            ))}
            {(!market.segments || market.segments.length === 0) && (
              <p className="text-sm text-muted-foreground">No segments data available.</p>
            )}
          </motion.div>
        </div>
      </div>


      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
        <Link href={`/dashboard/idea/${params.id}/validation`} className="w-full sm:w-auto">
          <Button variant="outline" className="gap-2 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" size="lg">
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
        </Link>
        <Link href={`/dashboard/idea/${params.id}/competitors`} className="w-full sm:w-auto">
          <Button className="gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press" size="lg">
            Next: Competitors <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
