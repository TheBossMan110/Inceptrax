"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Lightbulb, Globe, MessageSquare, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/dashboard",          icon: LayoutDashboard },
  { label: "Ideas",     href: "/dashboard/ideas",    icon: Lightbulb },
  { label: "Explore",   href: "/dashboard/explore",  icon: Globe },
  { label: "Chat",      href: "/dashboard/chat",     icon: MessageSquare },
  { label: "Settings",  href: "/dashboard/settings", icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Mobile navigation">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 px-1 py-2",
                "transition-all duration-150",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 transition-transform duration-150", isActive && "scale-110")} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
