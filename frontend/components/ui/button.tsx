import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base — consistent transition, focus, and active feedback
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-all duration-150 ease-in-out",
    "select-none cursor-pointer",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/88 hover:shadow-md',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/88 hover:shadow-md focus-visible:ring-destructive/50',
        outline:
          'border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-foreground/20 dark:bg-transparent dark:border-border dark:hover:bg-accent/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/70',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm:      'h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
        lg:      'h-10 rounded-lg px-6 text-sm has-[>svg]:px-4',
        xl:      'h-11 rounded-lg px-8 text-base has-[>svg]:px-6',
        icon:    'size-9 rounded-lg',
        'icon-sm':  'size-8 rounded-md',
        'icon-lg':  'size-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

/* Spinner SVG — 14×14 */
function ButtonSpinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <ButtonSpinner />
          <span>Loading…</span>
        </span>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
