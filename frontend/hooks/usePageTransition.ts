"use client"

import { useEffect, useRef } from "react"
import { gsap, ease, DURATION } from "@/lib/gsap"

export function usePageTransition() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (typeof window === "undefined") return

    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: DURATION.normal, ease }
    )
  }, [])

  return ref
}
