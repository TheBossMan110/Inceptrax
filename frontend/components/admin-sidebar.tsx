"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Settings,
  HelpCircle,
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

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-64 shrink-0 overflow-y-auto hidden md:flex">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Logo />
          <span>Inceptrax <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase ml-1">Admin</span></span>
        </Link>
      </div>

      <div className="flex-grow px-4 space-y-8">
        <div>
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Management</p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground rounded-xl hover:bg-muted hover:text-foreground transition-colors"
        >
          <Zap className="h-5 w-5 shrink-0" />
          Back to App
        </Link>
        <Link
          href="/admin/support"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground rounded-xl hover:bg-muted hover:text-foreground transition-colors"
        >
          <Shield className="h-5 w-5 shrink-0" />
          Admin Support
        </Link>
      </div>
    </div>
  )
}
