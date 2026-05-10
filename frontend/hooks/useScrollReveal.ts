"use client"

import { useEffect, useRef } from "react"
import { gsap, ScrollTrigger, ease, DURATION } from "@/lib/gsap"

export function useScrollReveal(stagger = 0.08) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (typeof window === "undefined") return

    const items = ref.current.querySelectorAll("[data-reveal]")
    if (!items.length) return

    // Set initial state
    gsap.set(items, { opacity: 0, y: 18 })

    const trigger = gsap.fromTo(
      items,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: DURATION.slow,
        ease,
        stagger,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 88%",
          once: true,
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [stagger])

  return ref
}
