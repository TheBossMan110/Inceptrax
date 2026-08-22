"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * GSAP scroll effects.
 *
 * Everything here animates transform and opacity only — the two properties the
 * browser can composite without a layout pass. Animating top/height/margin on
 * scroll is what makes a page feel like it is stepping rather than gliding.
 *
 * Each effect is a no-op under prefers-reduced-motion: the content renders in
 * its final state rather than being animated to it, so nothing is ever hidden
 * from someone who turned motion off.
 */

function useGsap() {
  const [lib, setLib] = useState<typeof import("@/lib/gsap") | null>(null)
  useEffect(() => {
    let alive = true
    import("@/lib/gsap").then((m) => alive && setLib(m))
    return () => { alive = false }
  }, [])
  return lib
}

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Moves its children at a different rate than the page.
 *
 * `speed` is how far the element drifts across its own scroll range, as a
 * fraction of viewport height. Negative rises, positive sinks.
 */
export function Parallax({
  children,
  speed = 0.15,
  className,
}: {
  children: React.ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const gsapLib = useGsap()

  useEffect(() => {
    if (!gsapLib || !ref.current || prefersReducedMotion()) return
    const { gsap } = gsapLib
    const el = ref.current

    const anim = gsap.fromTo(
      el,
      { yPercent: -speed * 50 },
      {
        yPercent: speed * 50,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,   // lag behind the scrollbar slightly — reads as weight
        },
      },
    )
    return () => { anim.scrollTrigger?.kill(); anim.kill() }
  }, [gsapLib, speed])

  return <div ref={ref} className={className}>{children}</div>
}

/**
 * Fades and lifts a section as it enters, then eases it away as it leaves.
 *
 * Unlike a one-shot reveal this stays tied to scroll position, so scrubbing
 * back up re-plays it — which is what makes a page feel responsive to the
 * reader rather than fire-and-forget.
 */
export function ScrollFade({
  children,
  className,
  lift = 60,
}: {
  children: React.ReactNode
  className?: string
  lift?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const gsapLib = useGsap()

  useEffect(() => {
    if (!gsapLib || !ref.current || prefersReducedMotion()) return
    const { gsap } = gsapLib
    const el = ref.current

    const anim = gsap.fromTo(
      el,
      { opacity: 0, y: lift, scale: 0.985 },
      {
        opacity: 1, y: 0, scale: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          end: "top 52%",
          scrub: 0.8,
        },
      },
    )
    return () => { anim.scrollTrigger?.kill(); anim.kill() }
  }, [gsapLib, lift])

  return <div ref={ref} className={className}>{children}</div>
}

/**
 * Pins a section and advances through its steps as the reader scrolls.
 *
 * The section holds still while the content changes — the reader controls the
 * pace of a sequence instead of watching it autoplay. Used for "how it works",
 * where the order genuinely matters.
 */
export function PinnedSequence({
  steps,
  className,
  renderStep,
}: {
  steps: unknown[]
  className?: string
  renderStep: (index: number, active: boolean) => React.ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const gsapLib = useGsap()

  useEffect(() => {
    if (!gsapLib || !wrapRef.current || prefersReducedMotion()) return
    const { ScrollTrigger } = gsapLib

    const trigger = ScrollTrigger.create({
      trigger: wrapRef.current,
      start: "top top",
      // One viewport of scroll per step after the first.
      end: () => `+=${(steps.length - 1) * window.innerHeight * 0.8}`,
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      onUpdate: (self) => {
        const i = Math.min(
          steps.length - 1,
          Math.round(self.progress * (steps.length - 1)),
        )
        setActive(i)
      },
    })
    return () => trigger.kill()
  }, [gsapLib, steps.length])

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {steps.map((_, i) => renderStep(i, i === active))}
    </div>
  )
}

/**
 * Button that leans toward the cursor.
 *
 * Kept deliberately subtle (max ~6px) — a control that chases the pointer too
 * eagerly becomes harder to click, not more delightful.
 */
export function Magnetic({
  children,
  strength = 0.25,
  className,
}: {
  children: React.ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    // Pointer-driven motion is meaningless without a pointer.
    if (window.matchMedia("(hover: none)").matches) return

    let raf = 0
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) * strength
      const dy = (e.clientY - (r.top + r.height / 2)) * strength
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${Math.max(-8, Math.min(8, dx))}px, ${Math.max(-8, Math.min(8, dy))}px, 0)`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = "translate3d(0,0,0)"
    }

    el.addEventListener("mousemove", onMove)
    el.addEventListener("mouseleave", onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("mouseleave", onLeave)
    }
  }, [strength])

  return (
    <div
      ref={ref}
      className={cn("transition-transform duration-500 ease-out", className)}
      style={{ willChange: "transform" }}
    >
      {children}
    </div>
  )
}
