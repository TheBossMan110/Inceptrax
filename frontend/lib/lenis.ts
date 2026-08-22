import Lenis from "lenis"

let lenis: Lenis | null = null
let rafId: number | null = null

export function initLenis() {
  if (lenis) return lenis

  // Respect the OS setting — smooth scroll is exactly the kind of motion
  // people disable it for.
  if (typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null
  }

  lenis = new Lenis({
    duration: 1.05,
    // Exponential ease-out: fast pickup, long settle. Feels weighted rather
    // than floaty, which is what makes smooth scroll read as premium instead
    // of laggy.
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    // Touch devices already have native momentum; doubling it feels wrong.
    syncTouch: false,
  })

  // ── Sync with GSAP ScrollTrigger ────────────────────────────────────
  // Lenis moves the page with transforms rather than real scroll, so
  // ScrollTrigger never hears about it and fires at the wrong positions.
  // Driving both from one loop keeps reveals landing where they should.
  let scrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger | null = null
  try {
    const mod = require("@/lib/gsap") as typeof import("@/lib/gsap")
    scrollTrigger = mod.ScrollTrigger
    lenis.on("scroll", () => scrollTrigger?.update())
  } catch {
    // GSAP not loaded on this route — smooth scroll still works alone.
  }

  function raf(time: number) {
    lenis?.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)

  return lenis
}

export function getLenis() {
  return lenis
}

/** Smooth-scroll to an element or offset. Falls back to native when Lenis is off. */
export function scrollTo(target: string | number, offset = -80) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.2 })
    return
  }
  if (typeof target === "string") {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" })
  } else if (typeof window !== "undefined") {
    window.scrollTo({ top: target, behavior: "smooth" })
  }
}

export function destroyLenis() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  lenis?.destroy()
  lenis = null
}
