"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, ArrowRight, X, Sparkles, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { onCreditBlock, type CreditBlockDetail } from "@/lib/api"

/**
 * Listens for 402 responses anywhere in the app and shows an upgrade prompt.
 *
 * Mounted once in the dashboard layout, so no individual page has to handle
 * "out of credits" itself — the moment any request is refused for lack of
 * credits or idea slots, this explains why and offers the fix.
 */
export function CreditGuard() {
    const router = useRouter()
    const [block, setBlock] = useState<CreditBlockDetail | null>(null)

    useEffect(() => onCreditBlock(setBlock), [])

    // Escape to dismiss
    useEffect(() => {
        if (!block) return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBlock(null)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [block])

    const isIdeaLimit = block?.error === "idea_limit_reached"
    const Icon = isIdeaLimit ? Lightbulb : Zap

    return (
        <AnimatePresence>
            {block && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="credit-guard-title"
                >
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setBlock(null)}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-md rounded-2xl border-gradient shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]"
                    >
                        <div className="relative rounded-2xl glass-strong p-7">
                            <button
                                onClick={() => setBlock(null)}
                                aria-label="Close"
                                className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                                <Icon className="h-5 w-5 text-brand-cyan" />
                            </div>

                            <p className="eyebrow mb-2.5">
                                {isIdeaLimit ? "Idea limit reached" : "Out of credits"}
                            </p>
                            <h2
                                id="credit-guard-title"
                                className="text-xl font-semibold tracking-tight mb-2.5"
                            >
                                {isIdeaLimit
                                    ? "You've used every idea on your plan"
                                    : "You need more credits for this"}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {block.message}
                            </p>

                            {/* Concrete numbers — vague limits feel arbitrary */}
                            <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/[0.07] bg-white/[0.02] divide-x divide-white/[0.07] overflow-hidden">
                                {isIdeaLimit ? (
                                    <>
                                        <Stat label="Ideas used" value={`${block.current ?? 0}`} />
                                        <Stat label="Your limit" value={`${block.maximum ?? 0}`} />
                                    </>
                                ) : (
                                    <>
                                        <Stat label="This costs" value={`${block.cost ?? 0}`} />
                                        <Stat label="You have" value={`${block.balance ?? 0}`} muted />
                                    </>
                                )}
                            </div>

                            <p className="mt-4 text-xs text-muted-foreground/70">
                                You&apos;re on the{" "}
                                <span className="text-foreground/80 font-medium">{block.tier_label}</span>{" "}
                                plan. Upgrading raises your monthly credits and unlocks premium AI models.
                            </p>

                            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                                <Button
                                    onClick={() => {
                                        setBlock(null)
                                        router.push(block.upgrade_url || "/dashboard/billing")
                                    }}
                                    className="flex-1 h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    See plans
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setBlock(null)}
                                    className="h-11 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
                                >
                                    Not now
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="px-4 py-3">
            <p className="text-[9px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                {label}
            </p>
            <p
                className={`mt-1.5 text-xl font-semibold tabular-nums tracking-tight leading-none ${
                    muted ? "text-muted-foreground" : "text-foreground"
                }`}
            >
                {value}
            </p>
        </div>
    )
}
