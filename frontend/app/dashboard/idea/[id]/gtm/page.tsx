"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Rocket, ArrowLeft, ArrowRight, AlertCircle, Filter } from "lucide-react"
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

const FUNNEL_STAGES = [
    { key: "awareness", label: "Awareness", dot: "bg-brand-cyan" },
    { key: "activation", label: "Activation", dot: "bg-brand" },
    { key: "conversion", label: "Conversion", dot: "bg-brand-violet" },
] as const

export default function GTMStrategyPage() {
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
                    <div className="skeleton h-8 w-80" />
                    <div className="skeleton h-4 w-full max-w-md" />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="skeleton h-80 rounded-2xl" />
                    <div className="space-y-6">
                        <div className="skeleton h-48 rounded-2xl" />
                        <div className="skeleton h-28 rounded-2xl" />
                    </div>
                </div>
            </div>
        )
    }

    if (!idea || !idea.analysis_data || !idea.analysis_data.gtm_strategy) {
        return (
            <div className="max-w-lg mx-auto py-10">
                <div className="card-premium rounded-2xl py-16 px-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                        <AlertCircle className="h-6 w-6 text-brand-cyan" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">GTM Strategy not found</h2>
                </div>
            </div>
        )
    }

    const gtm = idea.analysis_data?.gtm_strategy || {}

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
            <div className="flex items-start justify-between">
                <div>
                    <p className="eyebrow mb-2">Stage 07 — Launch</p>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">
                        Go-To-Market Strategy
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Launch and acquisition strategy for {idea.title}.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="card-premium rounded-2xl p-6 overflow-hidden">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
                            <Rocket className="h-4 w-4 text-brand-cyan" />
                        </div>
                        <h2 className="font-semibold text-base">Acquisition Channels</h2>
                    </div>
                    <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                        {(gtm.acquisition_channels || []).map((ac: any, i: number) => (
                            <motion.div
                                key={i}
                                variants={itemVariants}
                                className="space-y-1 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/25 transition-colors"
                            >
                                <h4 className="font-semibold text-sm text-foreground">{ac.channel || "Channel"}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">{ac.strategy}</p>
                            </motion.div>
                        ))}
                        {(!gtm.acquisition_channels || gtm.acquisition_channels.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">No acquisition channels data available.</p>
                        )}
                    </motion.div>
                </div>

                <div className="space-y-6">
                    <div className="card-premium rounded-2xl p-6 overflow-hidden">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/20 flex items-center justify-center">
                                <Filter className="h-4 w-4 text-brand-violet" />
                            </div>
                            <h2 className="font-semibold text-base">Funnel Strategy</h2>
                        </div>
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-0">
                            {FUNNEL_STAGES.map((stage, i) => (
                                <motion.div key={stage.key} variants={itemVariants} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-px h-3 ${i === 0 ? "bg-transparent" : "bg-gradient-to-b from-brand/40 to-brand-violet/40"}`} />
                                        <div className={`w-2.5 h-2.5 rounded-full ${stage.dot} shadow-[0_0_10px_oklch(0.585_0.222_277/0.6)]`} />
                                        <div className={`w-px flex-1 ${i === FUNNEL_STAGES.length - 1 ? "bg-transparent" : "bg-gradient-to-b from-brand/40 to-brand-violet/40"}`} />
                                    </div>
                                    <div className="pb-5 pt-1 min-w-0">
                                        <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">{stage.label}</h4>
                                        <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{gtm.funnel_stages?.[stage.key] || "N/A"}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    <div className="relative rounded-2xl border-gradient p-5">
                        <h3 className="eyebrow mb-2">
                            Early Traction (First 1,000 Users)
                        </h3>
                        <p className="text-sm text-foreground/90 leading-relaxed">
                            {gtm.early_traction || "Plan to be announced."}
                        </p>
                    </div>

                </div>
            </div>


            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
                <Link href={`/dashboard/idea/${params.id}/mvp-blueprint`} className="w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" size="lg">
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                </Link>
                <Link href={`/dashboard/idea/${params.id}/investor`} className="w-full sm:w-auto">
                    <Button className="gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press" size="lg">
                        Next: Investor Pitches <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}
