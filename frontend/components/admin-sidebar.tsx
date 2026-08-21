"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"

const navigation = [
  { name: "Admin Overview", href: "/admin", icon: LayoutDashboard },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
]

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
        "transition-all duration-200 ease-out",
        isActive
          ? "bg-brand/12 text-foreground shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)]"
          : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
      )}
    >
      {/* Active left-bar indicator */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand shadow-[0_0_12px_oklch(0.585_0.222_277/0.7)]"
          aria-hidden="true"
        />
      )}
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-all duration-200",
          isActive && "text-brand-cyan",
          "group-hover:scale-110"
        )}
      />
      <span className="truncate">{item.name}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-2 text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
      {children}
    </p>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="relative flex flex-col h-full bg-sidebar w-60 shrink-0 overflow-y-auto">
      {/* Ambient top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-brand/[0.07] to-transparent"
      />

      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0 relative z-10">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-sm">
          <Logo />
          <span className="text-gradient-subtle tracking-tight text-base">Inceptrax</span>
          <span className="text-[9px] font-mono font-medium uppercase tracking-[0.14em] bg-brand/15 text-brand-cyan border border-brand/25 px-1.5 py-0.5 rounded-full">
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-grow px-3 py-4 space-y-6 overflow-y-auto relative z-10">
        <div>
          <SectionLabel>Management</SectionLabel>
          <nav className="space-y-0.5">
            {navigation.map((item) => (
              <NavLink key={item.name} item={item} isActive={pathname === item.href} />
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom links */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5 shrink-0 relative z-10">
        <NavLink
          item={{ name: "Back to App", href: "/dashboard", icon: Zap }}
          isActive={false}
        />
        <NavLink
          item={{ name: "Admin Support", href: "/admin/support", icon: Shield }}
          isActive={pathname === "/admin/support"}
        />
      </div>
    </div>
  )
}
