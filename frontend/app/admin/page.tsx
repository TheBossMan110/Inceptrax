"use client"

import { useEffect, useState } from "react"
import { Users, Lightbulb, Zap, MousePointer2, ArrowUpRight } from "lucide-react"
import { AnimatedCounter } from "@/components/fx"
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
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2.5">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[124px] rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
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
      iconColor: "text-brand-cyan",
      trendUp: true,
    },
    {
      name: "Total Ideas",
      value: stats.total_ideas,
      icon: Lightbulb,
      change: "Lifetime ideas",
      iconColor: "text-warning",
      trendUp: false,
    },
    {
      name: "Website Hits",
      value: stats.total_visitors,
      icon: MousePointer2,
      change: "Unique sessions",
      iconColor: "text-success",
      trendUp: false,
    },
    {
      name: "Gemini Credits",
      value: isUnlimited ? "∞" : stats.api_usage.remaining,
      icon: Zap,
      change: `${stats.api_usage.used} used so far`,
      iconColor: "text-brand-violet",
      trendUp: false,
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-up">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin Control Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of Inceptrax platform health and growth.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.name}
            className="card-premium card-premium-hover rounded-2xl p-5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70 pt-1">
                {stat.name}
              </p>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums tracking-tight mt-1">
              {typeof stat.value === "number" ? (
                <AnimatedCounter value={stat.value} />
              ) : (
                stat.value
              )}
            </p>
            <p
              className={`text-xs font-medium mt-1.5 inline-flex items-center gap-1 ${
                stat.trendUp ? "text-success" : "text-muted-foreground"
              }`}
            >
              {stat.change}
              {stat.trendUp && <ArrowUpRight className="h-3 w-3" />}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API usage */}
        <div className="card-premium rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <div className="mb-6">
            <h3 className="text-base font-semibold tracking-tight">Gemini API Usage</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Resource consumption tracking</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total API Calls</span>
                <span className="font-semibold tabular-nums">{stats.api_usage.used}</span>
              </div>
              {/* Visual bar — shows calls proportionally (no cap) */}
              <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-brand-violet rounded-full transition-all duration-500 shadow-[0_0_12px_oklch(0.585_0.222_277/0.5)]"
                  style={{ width: `${Math.min(100, stats.api_usage.used)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                  Used Credits
                </p>
                <p className="text-lg font-bold tabular-nums mt-1">{stats.api_usage.used}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                  Budget
                </p>
                <p className="text-lg font-bold mt-1">
                  {isUnlimited ? (
                    <span className="text-success">Unlimited</span>
                  ) : (
                    <span className="tabular-nums">{stats.api_usage.remaining}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin shortcuts */}
        <div
          className="relative rounded-2xl border-gradient p-6 animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          <h3 className="text-base font-semibold tracking-tight">Admin Shortcuts</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Quickly manage the platform assets and user base.
          </p>
          <div className="grid gap-2.5 pt-5">
            <Link
              href="/admin/users"
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-medium text-sm px-4 flex items-center justify-between hover:bg-primary/90 glow-primary shimmer press transition-colors"
            >
              View All Users <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/settings"
              className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.03] text-foreground font-medium text-sm px-4 flex items-center justify-between hover:bg-white/[0.07] press transition-colors"
            >
              System Settings <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
