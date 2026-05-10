import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border">
        <DashboardSidebar />
      </aside>

      <div className="flex flex-col flex-grow min-w-0 overflow-hidden">
        <DashboardHeader />
        <main className="flex-grow overflow-y-auto p-4 md:p-6 animate-fade-in pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — only visible on <md */}
      <MobileBottomNav />
    </div>
  )
}
