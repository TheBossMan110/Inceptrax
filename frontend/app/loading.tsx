import { Logo } from "@/components/logo"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
      {/* Soft brand bloom behind the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-brand/15 blur-[120px] animate-pulse-glow"
      />

      <div className="relative flex flex-col items-center animate-fade-in">
        <div className="relative mb-6">
          <div
            aria-hidden
            className="absolute -inset-2 rounded-3xl bg-brand/25 blur-xl animate-pulse-glow"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl glass-strong">
            <Logo size={36} />
          </div>
        </div>

        <p className="mb-7 text-sm font-semibold tracking-tight text-gradient-subtle">
          Inceptrax
        </p>

        {/* Thin indeterminate gradient bar */}
        <div
          role="progressbar"
          aria-label="Loading"
          className="h-[2px] w-52 overflow-hidden rounded-full bg-white/[0.06]"
        >
          <div
            aria-hidden
            className="h-full w-1/4 animate-beam rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet"
          />
        </div>

        <span className="sr-only">Loading</span>
      </div>
    </div>
  )
}
