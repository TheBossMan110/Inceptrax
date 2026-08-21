import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { CreditGuard } from "@/components/credit-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-sidebar-border">
        <DashboardSidebar />
      </aside>

      <div className="flex flex-col flex-grow min-w-0 overflow-hidden relative">
        {/* Ambient glow behind content */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-72 w-[720px] rounded-full bg-brand/[0.06] blur-[120px]"
        />
        <DashboardHeader />
        <main className="flex-grow overflow-y-auto p-4 md:p-6 animate-fade-in pb-24 md:pb-6 relative">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — only visible on <md */}
      <MobileBottomNav />

      {/* Global 402 handler — any out-of-credits response prompts to upgrade */}
      <CreditGuard />
    </div>
  )
}
