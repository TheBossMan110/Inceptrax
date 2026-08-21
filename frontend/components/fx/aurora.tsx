import { cn } from "@/lib/utils"

/**
 * Aurora backdrop: drifting gradient orbs + masked grid + grain.
 * Position parent as `relative overflow-hidden`; this fills it (absolute, -z).
 */
export function Aurora({
  className,
  intensity = "default",
  grid = true,
}: {
  className?: string
  intensity?: "default" | "subtle"
  grid?: boolean
}) {
  const opacity = intensity === "subtle" ? "opacity-50" : "opacity-100"
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 -z-10 overflow-hidden noise", opacity, className)}
    >
      {grid && <div className="absolute inset-0 bg-grid bg-grid-fade" />}
      {/* Indigo core */}
      <div className="animate-aurora absolute -top-[20%] left-1/2 -translate-x-1/2 h-[540px] w-[760px] rounded-full bg-brand/25 blur-[120px]" />
      {/* Violet edge */}
      <div className="animate-aurora-slow absolute top-[5%] left-[12%] h-[380px] w-[380px] rounded-full bg-brand-violet/16 blur-[100px]" />
      {/* Cyan whisper */}
      <div className="animate-aurora absolute top-[12%] right-[8%] h-[320px] w-[320px] rounded-full bg-brand-cyan/12 blur-[110px] [animation-delay:-7s]" />
    </div>
  )
}
