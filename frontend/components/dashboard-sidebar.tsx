"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Lightbulb,
  Search,
  Target,
  Settings,
  Sparkles,
  PlusCircle,
  HelpCircle,
  CreditCard,
  Zap,
  Rocket,
  Briefcase,
  FlaskConical,
  UserCheck,
  ShieldAlert,
  Mic,
  Eye,
  Globe,
  MessageSquare,
  Radar,
  MessagesSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { Logo } from "@/components/logo"
import { CreditBalanceWidget } from "@/components/credit-balance-widget"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Ideas", href: "/dashboard/ideas", icon: Lightbulb },
  { name: "Explore Ideas", href: "/dashboard/explore", icon: Globe },
  { name: "Messages", href: "/dashboard/chat", icon: MessageSquare },
]

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

function NavLink({
  item,
  isActive,
  accent = false,
  badge,
}: {
  item: NavItem
  isActive: boolean
  accent?: boolean
  badge?: number | null
}) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 h-9 rounded-lg pl-3 pr-2 text-[13px]",
        "transition-colors duration-200 ease-out",
        isActive
          ? "font-semibold text-foreground"
          : "font-medium text-muted-foreground/90 hover:text-foreground hover:bg-white/[0.045]"
      )}
    >
      {/* Active surface — directional wash + inner top-light */}
      {isActive && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-lg border shadow-[inset_0_1px_0_oklch(1_0_0_/_0.07)]",
            accent
              ? "border-brand-violet/20 bg-gradient-to-r from-brand-violet/[0.20] via-brand-violet/[0.07] to-transparent"
              : "border-brand/20 bg-gradient-to-r from-brand/[0.22] via-brand/[0.08] to-transparent"
          )}
        />
      )}

      {/* Rail — solid when active, a whisper on hover */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200",
          isActive
            ? accent
              ? "h-5 bg-brand-violet shadow-[0_0_12px_oklch(0.64_0.24_305/0.7)]"
              : "h-5 bg-brand shadow-[0_0_12px_oklch(0.585_0.222_277/0.7)]"
            : "h-3.5 bg-white/25 opacity-0 group-hover:opacity-100"
        )}
      />

      <item.icon
        className={cn(
          "relative h-4 w-4 shrink-0 transition-colors duration-200",
          isActive
            ? accent
              ? "text-brand-violet"
              : "text-brand-cyan"
            : "text-muted-foreground/70 group-hover:text-foreground/90"
        )}
      />
      <span className="relative truncate">{item.name}</span>
      {badge != null && badge > 0 && (
        <span className="relative ml-auto h-5 min-w-[20px] px-1.5 rounded-full bg-brand text-white text-[10px] font-bold tabular-nums flex items-center justify-center shrink-0 shadow-[0_0_10px_oklch(0.585_0.222_277/0.5)]">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3 mb-2.5">
      <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/55 whitespace-nowrap">
        {children}
      </p>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-gradient-to-r from-white/[0.09] to-transparent"
      />
    </div>
  )
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const retryRef = useRef(0)

  const fetchUnread = useCallback(async () => {
    if (retryRef.current >= 5) return
    try {
      const res = await apiFetch("/chat/unread-count")
      setUnreadMessages(res.unread_count || 0)
      retryRef.current = 0
    } catch (err: any) {
      if (err?.message?.includes("429")) retryRef.current += 1
    }
  }, [])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  const ideaMatch = pathname.match(/\/dashboard\/idea\/([^\/]+)/)
  const currentIdeaId = ideaMatch ? ideaMatch[1] : null

  const analysisLinks: NavItem[] = currentIdeaId
    ? [
        { name: "Validation",       href: `/dashboard/idea/${currentIdeaId}/validation`,       icon: Sparkles },
        { name: "Market Research",  href: `/dashboard/idea/${currentIdeaId}/market`,            icon: Search },
        { name: "Competitors",      href: `/dashboard/idea/${currentIdeaId}/competitors`,       icon: Target },
        { name: "Monetization",     href: `/dashboard/idea/${currentIdeaId}/monetization`,      icon: CreditCard },
        { name: "MVP Blueprint",    href: `/dashboard/idea/${currentIdeaId}/mvp-blueprint`,     icon: Zap },
        { name: "Go-To-Market",     href: `/dashboard/idea/${currentIdeaId}/gtm`,               icon: Rocket },
        { name: "Investor Pitches", href: `/dashboard/idea/${currentIdeaId}/investor`,          icon: Briefcase },
        { name: "Research Hub",     href: `/dashboard/idea/${currentIdeaId}/research-hub`,      icon: FlaskConical },
        { name: "Competitor Watch", href: `/dashboard/idea/${currentIdeaId}/competitor-watch`,  icon: Eye },
      ]
    : []

  const bonusLinks: NavItem[] = currentIdeaId
    ? [
        { name: "Ask Anything",     href: `/dashboard/idea/${currentIdeaId}/ask`,           icon: MessagesSquare },
        { name: "Idea Watcher",     href: `/dashboard/idea/${currentIdeaId}/watcher`,       icon: Radar },
        { name: "Improve with AI",  href: `/dashboard/idea/${currentIdeaId}/improve`,       icon: Sparkles },
        { name: "Founder Match",    href: `/dashboard/idea/${currentIdeaId}/founder-match`, icon: UserCheck },
        { name: "Stress Test",      href: `/dashboard/idea/${currentIdeaId}/stress-test`,   icon: ShieldAlert },
        { name: "One-Line Pitch",   href: `/dashboard/idea/${currentIdeaId}/one-liner`,     icon: Mic },
      ]
    : []

  return (
    <div className="relative flex flex-col h-full bg-sidebar w-60 shrink-0 overflow-y-auto">
      {/* Ambient wash — indigo bloom at the top, faint vertical light */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 h-64 w-72 rounded-full bg-brand/[0.13] blur-[72px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.028] via-transparent to-white/[0.015]" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/[0.10] via-white/[0.03] to-transparent" />
      </div>

      {/* Logo */}
      <div className="relative h-16 flex items-center px-5 shrink-0 z-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-sm opacity-95 hover:opacity-100 transition-opacity duration-200"
        >
          <Logo />
          <span className="text-gradient-subtle tracking-tight text-base">Inceptrax</span>
        </Link>
        <span
          aria-hidden
          className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent"
        />
      </div>

      {/* New Idea CTA */}
      <div className="px-3 pt-4 pb-3 relative z-10">
        <Button
          asChild
          className="w-full justify-start gap-2 h-10 text-[13px] font-semibold rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press"
          size="default"
        >
          <Link href="/dashboard/new-idea">
            <PlusCircle className="h-4 w-4" />
            New Idea
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-grow px-3 pt-1 pb-4 space-y-7 overflow-y-auto relative z-10">
        <div>
          <SectionLabel>Navigation</SectionLabel>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                item={item}
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href) && !currentIdeaId)}
                badge={item.href === "/dashboard/chat" ? unreadMessages : null}
              />
            ))}
          </nav>
        </div>

        {analysisLinks.length > 0 && (
          <div>
            <SectionLabel>Analysis</SectionLabel>
            <nav className="space-y-1">
              {analysisLinks.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={pathname.startsWith(item.href)}
                />
              ))}
            </nav>
          </div>
        )}

        {bonusLinks.length > 0 && (
          <div>
            <SectionLabel>Bonus Tools</SectionLabel>
            <nav className="space-y-1">
              {bonusLinks.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  isActive={pathname.startsWith(item.href)}
                  accent
                />
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Credit Balance */}
      <div className="px-3 pb-1 shrink-0 relative z-10">
        <CreditBalanceWidget />
      </div>

      {/* Bottom settings */}
      <div className="relative px-3 pt-3 pb-3 space-y-1 shrink-0 z-10">
        <span
          aria-hidden
          className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
        />
        <NavLink
          item={{ name: "Billing", href: "/dashboard/billing", icon: CreditCard }}
          isActive={pathname.startsWith("/dashboard/billing")}
        />
        <NavLink
          item={{ name: "Settings", href: "/dashboard/settings", icon: Settings }}
          isActive={pathname === "/dashboard/settings"}
        />
        <NavLink
          item={{ name: "Support", href: "/dashboard/support", icon: HelpCircle }}
          isActive={pathname === "/dashboard/support"}
        />
      </div>
    </div>
  )
}
