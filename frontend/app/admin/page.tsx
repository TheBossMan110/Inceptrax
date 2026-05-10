"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Lightbulb, Zap, MousePointer2, Loader2, ArrowUpRight } from "lucide-react"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

interface AdminStats {
  total_users: number
  total_ideas: number
  signups_today: number
  total_visitors: number
  api_usage: {
    used: number
    remaining: string | number
    total_budget: string | number
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiFetch("/admin/stats")
        setStats(response)
      } catch (error) {
        console.error("Failed to fetch admin stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) return null

  const isUnlimited = typeof stats.api_usage.total_budget === "string"

  const statCards = [
    {
      name: "Total Users",
      value: stats.total_users,
      icon: Users,
      change: `${stats.signups_today} new today`,
      color: "text-blue-500",
    },
    {
      name: "Total Ideas",
      value: stats.total_ideas,
      icon: Lightbulb,
      change: "Lifetime ideas",
      color: "text-amber-500",
    },
    {
      name: "Website Hits",
      value: stats.total_visitors,
      icon: MousePointer2,
      change: "Unique sessions",
      color: "text-green-500",
    },
    {
      name: "Gemini Credits",
      value: isUnlimited ? "∞" : stats.api_usage.remaining,
      icon: Zap,
      change: `${stats.api_usage.used} used so far`,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Admin Control Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time overview of Inceptrax platform health and growth.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1 inline-flex items-center gap-1">
                {stat.change} <ArrowUpRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Gemini API Usage</CardTitle>
            <p className="text-sm text-muted-foreground">Resource consumption tracking</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total API Calls</span>
                <span className="font-semibold tabular-nums">{stats.api_usage.used}</span>
              </div>
              {/* Visual bar — shows calls proportionally (no cap) */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.api_usage.used)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Used Credits</p>
                <p className="text-lg font-bold tabular-nums">{stats.api_usage.used}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Budget</p>
                <p className="text-lg font-bold">
                  {isUnlimited ? (
                    <span className="text-green-600 dark:text-green-400">Unlimited ✓</span>
                  ) : (
                    stats.api_usage.remaining
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-foreground text-background border-0">
          <CardHeader>
            <CardTitle className="text-base text-background">Admin Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-background/70 text-sm leading-relaxed">
              Quickly manage the platform assets and user base.
            </p>
            <div className="grid gap-2 pt-1">
              <Link
                href="/admin/users"
                className="w-full h-10 rounded-lg bg-background text-foreground font-medium text-sm px-4 flex items-center justify-between hover:bg-background/90 transition-colors"
              >
                View All Users <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/settings"
                className="w-full h-10 rounded-lg bg-background/10 text-background font-medium text-sm border border-background/20 px-4 flex items-center justify-between hover:bg-background/20 transition-colors"
              >
                System Settings <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
