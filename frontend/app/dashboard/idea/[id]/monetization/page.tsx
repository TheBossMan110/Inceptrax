"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { CreditCard, ArrowLeft, ArrowRight, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

export default function MonetizationPage() {
    const params = useParams()
    const [idea, setIdea] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchIdea() {
            try {
                const response = await apiFetch(`/ideas/${params.id}`)
                setIdea(response.data.idea)
            } catch (error) {
                console.error("Failed to fetch idea:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchIdea()
    }, [params.id])

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                <div className="space-y-3">
                    <div className="skeleton h-8 w-72" />
                    <div className="skeleton h-4 w-full max-w-md" />
                </div>
                <div className="skeleton h-40 rounded-2xl" />
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="skeleton h-56 rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (!idea || !idea.analysis_data || !idea.analysis_data.monetization) {
        return (
            <div className="max-w-lg mx-auto py-10">
                <div className="card-premium rounded-2xl py-16 px-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                        <AlertCircle className="h-6 w-6 text-brand-cyan" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">Monetization Analysis not found</h2>
                </div>
            </div>
        )
    }

    const monetization = idea.analysis_data?.monetization || {}

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <p className="eyebrow mb-2">Stage 05 — Revenue</p>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">
                        Monetization Strategy
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Revenue models and pricing strategy for {idea.title}.
                    </p>
                </div>
            </div>

            <div className="card-premium rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-brand-cyan" />
                    </div>
                    <h2 className="font-semibold text-base">Revenue Model</h2>
                </div>

                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                            <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Pricing Model</h3>
                            <p className="text-sm text-foreground/90 leading-relaxed">{monetization.pricing_model || "N/A"}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                            <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Conversion Logic</h3>
                            <p className="text-sm text-foreground/90 leading-relaxed">{monetization.conversion_logic || "N/A"}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Recommended Plans</h3>
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {(monetization.plans || []).map((plan: any, i: number) => (
                                <motion.div
                                    key={i}
                                    variants={itemVariants}
                                    className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/30 transition-colors"
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h4 className="font-semibold text-sm">{plan.name || "Plan"}</h4>
                                        <span className="text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-brand/15 text-brand-cyan border border-brand/25 shrink-0">
                                            {plan.price || "N/A"}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">{plan.target}</p>
                                    <ul className="space-y-1.5">
                                        {(plan.features || []).map((f: string, j: number) => (
                                            <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-2">
                                                <Check className="h-3 w-3 text-brand-cyan shrink-0 mt-0.5" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                            {(!monetization.plans || monetization.plans.length === 0) && (
                                <p className="text-sm text-muted-foreground italic">No plans data available.</p>
                            )}
                        </motion.div>
                    </div>

                    <div className="relative rounded-2xl border-gradient p-5">
                        <h3 className="eyebrow mb-2">Recommended Strategy</h3>
                        <p className="text-sm text-foreground/90 leading-relaxed accent-serif text-base">
                            &ldquo;{monetization.recommended_strategy || "Strategy not available."}&rdquo;
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
                <Link href={`/dashboard/idea/${params.id}/competitors`} className="w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" size="lg">
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                </Link>
                <Link href={`/dashboard/idea/${params.id}/mvp-blueprint`} className="w-full sm:w-auto">
                    <Button className="gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press" size="lg">
                        Next: MVP Blueprint <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}
