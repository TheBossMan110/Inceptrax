"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Users, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { ExpandableText } from "@/components/ui/expandable-text"

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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    )
  }

  if (!idea || !idea.analysis_data) {
    return (
      <div className="text-center py-20 text-foreground">
        <h2 className="text-2xl font-bold">Market Analysis not found</h2>
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Market Research
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Deep-dive into the target market for {idea.title}.
          </p>
        </div>
        <Button
          onClick={handleFetchMarketData}
          disabled={isSearching}
          className="rounded-xl gap-2 font-semibold w-full sm:w-auto h-12 sm:h-10"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          {(searchResults || []).length > 0 ? "Refresh Market Data" : "Fetch Live Market Data"}
        </Button>
      </div>

      {/* Live Market Insights */}
      {(searchResults || []).length > 0 && (
        <Card className="border-none shadow-sm bg-card/60 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Globe className="h-5 w-5 text-primary" /> Live Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(searchResults || []).map((result, i) => (
                <a
                  key={i}
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{result.source}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{result.date}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                    {result.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {result.snippet}
                  </p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAM / SAM / SOM */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {["tam", "sam", "som"].map((key, i) => (
          <Card key={i} className="border-none shadow-sm bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {key.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {market[key] || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {key === "tam"
                  ? "Total Addressable Market"
                  : key === "sam"
                    ? "Serviceable Addressable Market"
                    : "Serviceable Obtainable Market"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trends & Segments */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Key Market Trends */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Globe className="h-5 w-5 text-primary" /> Key Market Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(market.trends || []).map((trend: any, i: number) => (
              <div key={i} className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground break-words">
                  {trend.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed break-words whitespace-normal">
                  <span>{trend.description} </span>
                </p>
              </div>
            ))}
            {(!market.trends || market.trends.length === 0) && (
              <p className="text-sm text-muted-foreground">No trends data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-secondary" /> Customer Segments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(market.segments || []).map((segment: any, i: number) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-muted/30 border border-border overflow-hidden"
              >
                <h3 className="font-semibold text-sm mb-1 text-foreground break-words">
                  {segment.name}
                </h3>

                <div className="text-xs text-muted-foreground mb-3 break-words whitespace-normal">
                  <ExpandableText text={segment.description} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] py-0 max-w-full whitespace-normal break-words text-center"
                  >
                    {segment.percentage} Segment
                  </Badge>

                  <Badge
                    variant="secondary"
                    className="text-[10px] py-0 max-w-full whitespace-normal break-words text-center"
                  >
                    {segment.wtp} WTP
                  </Badge>
                </div>
              </div>
            ))}
            {(!market.segments || market.segments.length === 0) && (
              <p className="text-sm text-muted-foreground">No segments data available.</p>
            )}
          </CardContent>
        </Card>
      </div>


      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
        <Link href={`/dashboard/idea/${params.id}/validation`} className="w-full sm:w-auto">
          <Button variant="outline" className="gap-2 w-full" size="lg">
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
        </Link>
        <Link href={`/dashboard/idea/${params.id}/competitors`} className="w-full sm:w-auto">
          <Button className="gap-2 w-full" size="lg">
            Next: Competitors <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div >
  )
}
