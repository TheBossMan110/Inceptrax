"use client"

import type React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { DashboardHeader } from "@/components/dashboard-header"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user || !user.is_admin) {
        // Redirect non-admins or unauthenticated users
        // Admin check uses is_admin flag from the database
        router.push("/dashboard")
      }
    }
  }, [user, loading, router])

  if (loading || !user || !user.is_admin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-sidebar-border">
        <AdminSidebar />
      </aside>

      <div className="flex flex-col flex-grow min-w-0 overflow-hidden relative">
        {/* Ambient glow behind content */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-72 w-[720px] rounded-full bg-brand/[0.06] blur-[120px]"
        />
        <DashboardHeader />
        <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in pb-24 md:pb-8 relative">
          {children}
        </main>
      </div>

      {/* Admin Mobile Bottom Nav */}
      <AdminMobileNav />
    </div>
  )
}
