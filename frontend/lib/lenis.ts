import Lenis from "lenis"

let lenis: Lenis | null = null
let rafId: number | null = null

export function initLenis() {
  if (lenis) return lenis

  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
  })

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

export function destroyLenis() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  lenis?.destroy()
  lenis = null
}
