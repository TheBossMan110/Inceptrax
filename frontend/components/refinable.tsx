"use client"

import { useRefineContext } from "./refine-context"
import { get } from "@/lib/utils"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RefinableProps {
    path: string
    children: (value: any) => React.ReactNode
    className?: string
}

export function Refinable({ path, children, className }: RefinableProps) {
    const { originalData, currentData, isPending, confirmChanges, rejectChanges } = useRefineContext()

    // Get values
    const currentValue = currentData ? get(currentData, path) : null
    const originalValue = originalData ? get(originalData, path) : currentValue

    // Check if changed
    const hasChanged = isPending && JSON.stringify(currentValue) !== JSON.stringify(originalValue)

    // Pass the appropriate value to children (always current value, so user sees update)
    const content = children(currentValue)

    if (!hasChanged) {
        return <div className={className}>{content}</div>
    }

    return (
        <div className={cn("relative group transition-all duration-300", className)}>
            {/* Highlight Background */}
            <div className="bg-red-50/80 rounded-lg -m-1 p-1 ring-1 ring-red-200">
                {content}
            </div>

            {/* Controls - Floating above */}
            <div className="absolute -top-3 right-0 z-10 flex gap-1 opacity-100 animate-in fade-in zoom-in duration-200">
                <Button
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        rejectChanges()
                    }}
                    className="h-6 w-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 p-0 shadow-sm border border-red-200"
                    title="Reject Changes"
                >
                    <X className="h-3 w-3" />
                </Button>
                <Button
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        confirmChanges()
                    }}
                    className="h-6 w-6 rounded-full bg-green-100 hover:bg-green-200 text-green-600 p-0 shadow-sm border border-green-200"
                    title="Accept Changes"
                >
                    <Check className="h-3 w-3" />
                </Button>
            </div>
        </div>
    )
}
