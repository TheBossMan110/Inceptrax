"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Settings, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Overview", href: "/admin",          icon: LayoutDashboard },
  { label: "Users",    href: "/admin/users",    icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "App",      href: "/dashboard",      icon: Zap },
]

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Admin mobile navigation">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 px-1 py-2",
                "transition-all duration-200 ease-out",
                isActive
                  ? "text-brand-cyan font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110 drop-shadow-[0_0_8px_oklch(0.585_0.222_277/0.6)]"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand shadow-[0_0_8px_oklch(0.585_0.222_277/0.8)]" />
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
