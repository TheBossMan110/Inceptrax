import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout
        'h-10 w-full min-w-0 rounded-lg border',
        'bg-background px-3 py-2 text-sm',
        // Colors
        'border-border text-foreground',
        'placeholder:text-muted-foreground/60',
        'dark:bg-input/20 dark:border-border',
        // Transitions
        'transition-[border-color,box-shadow,background-color] duration-150 ease-in-out',
        // Focus
        'outline-none',
        'focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0',
        // File input
        'file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        // Disabled
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/30',
        // Error state
        'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        'selection:bg-primary selection:text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
