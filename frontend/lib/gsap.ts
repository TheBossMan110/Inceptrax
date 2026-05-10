import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register only what we use
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

// Default easing — use everywhere for consistency
export const ease = "power2.out"

// Default durations
export const DURATION = {
  fast: 0.18,    // Micro-interactions (hover, click)
  normal: 0.28,  // Component transitions
  slow: 0.45,    // Page-level reveals
}

export { gsap, ScrollTrigger }
