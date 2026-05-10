"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { initLenis, destroyLenis } from "@/lib/lenis"

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Only enable Lenis on non-dashboard pages
  // Dashboard uses overflow-y-auto on nested containers which conflicts with Lenis
  const isDashboard = pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin")

  useEffect(() => {
    if (isDashboard) return // Skip Lenis on dashboard pages

    const lenis = initLenis()
    return () => destroyLenis()
  }, [isDashboard])

  return <>{children}</>
}
