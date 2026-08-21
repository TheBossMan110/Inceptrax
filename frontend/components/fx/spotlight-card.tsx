"use client"

import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

/**
 * Card with a mouse-tracking radial glow on the border + surface.
 * Pure CSS variables — zero re-renders on mousemove.
 */
export function SpotlightCard({
  children,
  className,
  spotColor = "oklch(0.585 0.222 277 / 0.16)",
  as: Tag = "div",
}: {
  children: React.ReactNode
  className?: string
  spotColor?: string
  as?: React.ElementType
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`)
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`)
  }, [])

  return (
    <Tag
      ref={ref}
      onMouseMove={onMouseMove}
      className={cn("group/spot relative overflow-hidden rounded-2xl card-premium", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotColor}, transparent 65%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </Tag>
  )
}
