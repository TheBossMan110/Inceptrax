"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Globe, Search, Eye, ArrowRight, MessageSquare, TrendingUp,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PublicIdea {
  id: number
  title: string
  description: string
  industry: string
  overall_score: number
  share_token: string
  public_views: number
  created_at: string
  founder_name: string
  founder_initial: string
  founder_id: number
}

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Top Scored", value: "score" },
  { label: "Most Viewed", value: "most_viewed" },
]

function scoreColor(score: number) {
  if (score >= 75) return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30"
  if (score >= 50) return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
  return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30"
}

function IdeaSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-14 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [ideas, setIdeas] = useState<PublicIdea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchIdeas()
  }, [sort, currentPage])

  async function fetchIdeas() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: "12",
        sort,
      })
      const res = await apiFetch(`/ideas/public?${params.toString()}`)
      setIdeas(res.data.ideas || [])
      setTotalPages(res.data.pages || 1)
      setTotalCount(res.data.total || 0)
    } catch (err) {
      console.error("Failed to fetch public ideas:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = searchQuery.trim()
    ? ideas.filter(
        (idea) =>
          idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          idea.industry.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ideas

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explore Ideas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover validated startup ideas shared by other founders
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas by name, industry, or description…"
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border h-10 items-center shrink-0">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setCurrentPage(1) }}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap",
                sort === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {isLoading ? "Loading…" : `${totalCount} public idea${totalCount !== 1 ? "s" : ""} found`}
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <IdeaSkeleton key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((idea) => (
            <Card key={idea.id} className="group overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200 border">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold shrink-0">
                      {idea.founder_initial}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{idea.founder_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(idea.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {idea.overall_score > 0 && (
                    <span className={cn("text-sm font-bold tabular-nums px-2.5 py-1 rounded-full", scoreColor(idea.overall_score))}>
                      {idea.overall_score}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">{idea.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{idea.description}</p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex gap-1.5 flex-wrap">
                    {idea.industry && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{idea.industry}</span>
                    )}
                    {idea.public_views > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {idea.public_views}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs" asChild>
                    <Link href={`/share/${idea.share_token}`}>View Analysis <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                    <Link href={`/dashboard/chat?with=${idea.founder_id}`}>
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
            <Globe className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">No public ideas yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term" : "Be the first to make your idea public!"}
            </p>
          </div>
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>Clear Search</Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="icon-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3 tabular-nums">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="icon-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
