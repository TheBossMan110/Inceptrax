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
  Users,
  UserCheck,
  ShieldAlert,
  Mic,
  Eye,
  Globe,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { Logo } from "@/components/logo"

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
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
        "transition-all duration-150 ease-in-out",
        isActive
          ? accent
            ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
            : "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {/* Active left-bar indicator */}
      {isActive && (
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full",
            accent ? "bg-violet-500" : "bg-primary-foreground"
          )}
          aria-hidden="true"
        />
      )}
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-150",
          "group-hover:scale-105"
        )}
      />
      <span className="truncate">{item.name}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto h-5 min-w-[20px] px-1.5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
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
        { name: "Improve with AI",  href: `/dashboard/idea/${currentIdeaId}/improve`,       icon: Sparkles },
        { name: "Founder Match",    href: `/dashboard/idea/${currentIdeaId}/founder-match`, icon: UserCheck },
        { name: "Stress Test",      href: `/dashboard/idea/${currentIdeaId}/stress-test`,   icon: ShieldAlert },
        { name: "One-Line Pitch",   href: `/dashboard/idea/${currentIdeaId}/one-liner`,     icon: Mic },
      ]
    : []

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-60 shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-sm">
          <Logo />
          <span className="text-foreground tracking-tight">Inceptrax</span>
        </Link>
      </div>

      {/* New Idea CTA */}
      <div className="px-3 pt-4 pb-2">
        <Button asChild className="w-full justify-start gap-2 h-9 text-sm" size="default">
          <Link href="/dashboard/new-idea">
            <PlusCircle className="h-4 w-4" />
            New Idea
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-grow px-3 py-3 space-y-6 overflow-y-auto">
        {/* Main nav */}
        <div>
          <SectionLabel>Navigation</SectionLabel>
          <nav className="space-y-0.5">
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

        {/* Analysis links — only when inside an idea */}
        {analysisLinks.length > 0 && (
          <div>
            <SectionLabel>Analysis</SectionLabel>
            <nav className="space-y-0.5">
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

        {/* Bonus tools */}
        {bonusLinks.length > 0 && (
          <div>
            <SectionLabel>Bonus Tools</SectionLabel>
            <nav className="space-y-0.5">
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

      {/* Bottom settings */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5 shrink-0">
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
