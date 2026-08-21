import { cn } from "@/lib/utils"

/**
 * Infinite horizontal marquee with edge fade. Children are duplicated
 * for the seamless loop — keep them presentational.
 */
export function Marquee({
  children,
  className,
  duration = 36,
  reverse = false,
}: {
  children: React.ReactNode
  className?: string
  duration?: number
  reverse?: boolean
}) {
  return (
    <div className={cn("marquee-mask overflow-hidden", className)}>
      <div
        className="animate-marquee flex w-max items-center gap-12 pr-12"
        style={{
          ["--marquee-duration" as string]: `${duration}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
        <div aria-hidden className="flex items-center gap-12 pr-12">
          {children}
        </div>
      </div>
    </div>
  )
}
