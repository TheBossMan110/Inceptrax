"use client"

import { useEffect, useRef } from "react"
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion"

/**
 * Counts up from 0 to `value` when scrolled into view.
 * Renders prefix/suffix around a tabular-nums number.
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduced = useReducedMotion()
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 55, damping: 18 })

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      el.textContent = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
      return
    }
    return spring.on("change", (v) => {
      el.textContent = v.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    })
  }, [spring, decimals, reduced, value])

  return (
    <motion.span className={className}>
      {prefix}
      <span ref={ref} className="tabular-nums">
        0
      </span>
      {suffix}
    </motion.span>
  )
}
