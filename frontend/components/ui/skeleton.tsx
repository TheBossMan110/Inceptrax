import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

/** Skeleton for a stat card */
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-5 rounded-md" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/** Skeleton for an idea list card */
function IdeaCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  )
}

/** Skeleton for analysis stage cards — 3 stacked */
function StageSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for a feature card */
function FeatureCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

export { Skeleton, StatCardSkeleton, IdeaCardSkeleton, StageSkeleton, FeatureCardSkeleton }
