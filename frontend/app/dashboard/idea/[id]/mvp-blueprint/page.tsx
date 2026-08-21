"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Zap, ArrowLeft, ArrowRight, Clock, DollarSign, Code2, AlertCircle, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

function priorityBadge(priority?: string) {
    return priority === "Must-have"
        ? "bg-brand/15 text-brand-cyan border border-brand/25"
        : "bg-white/[0.05] text-muted-foreground border border-white/10"
}

export default function MVPBlueprintPage() {
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
                    <div className="skeleton h-8 w-64" />
                    <div className="skeleton h-4 w-full max-w-md" />
                </div>
                <div className="skeleton h-28 rounded-2xl" />
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="skeleton h-24 rounded-2xl" />
                    <div className="skeleton h-24 rounded-2xl" />
                </div>
                <div className="skeleton h-72 rounded-2xl" />
            </div>
        )
    }

    if (!idea || !idea.analysis_data) {
        return (
            <div className="max-w-lg mx-auto py-10">
                <div className="card-premium rounded-2xl py-16 px-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                        <AlertCircle className="h-6 w-6 text-brand-cyan" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">MVP Blueprint not found</h2>
                    <p className="text-sm text-muted-foreground mt-2">Please run the analysis first.</p>
                </div>
            </div>
        )
    }

    // Support both formats: phases array (new) or flat features array (legacy)
    const mvpData = idea.analysis_data?.stage_results?.mvp_planning || idea.analysis_data?.mvp_planning || {}
    const phases = idea.analysis_data?.mvp_blueprint || mvpData?.phases || []
    const techStack = idea.analysis_data?.mvp_tech_stack || mvpData?.tech_stack || {}
    const timeline = idea.analysis_data?.mvp_timeline || mvpData?.estimated_timeline || ""
    const cost = idea.analysis_data?.mvp_cost || mvpData?.estimated_cost || ""
    const coreHypothesis = mvpData?.core_hypothesis || ""
    const successMetrics = mvpData?.success_metrics || []

    // Flatten features if phases format
    const isPhaseFormat = phases.length > 0 && phases[0]?.phase && phases[0]?.features
    const allFeatures = isPhaseFormat
        ? phases.flatMap((p: any) => (p.features || []).map((f: any) => ({ ...f, phase: p.phase })))
        : phases

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
            <div className="flex items-start justify-between">
                <div>
                    <p className="eyebrow mb-2">Stage 06 — Build Plan</p>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient-subtle">
                        MVP Blueprint
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Minimum Viable Product roadmap for {idea.title}.
                    </p>
                </div>
            </div>

            {/* Core Hypothesis */}
            {coreHypothesis && (
                <div className="relative rounded-2xl border-gradient p-6">
                    <p className="eyebrow mb-2.5">Core Hypothesis</p>
                    <p className="text-foreground/90 font-medium leading-relaxed">{coreHypothesis}</p>
                </div>
            )}

            {/* Timeline & Cost */}
            {(timeline || cost) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {timeline && (
                        <div className="card-premium card-premium-hover rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-cyan/25 to-brand/15 border border-brand-cyan/20 flex items-center justify-center shrink-0">
                                <Clock className="h-5 w-5 text-brand-cyan" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Timeline</p>
                                <p className="font-semibold text-foreground mt-0.5">{timeline}</p>
                            </div>
                        </div>
                    )}
                    {cost && (
                        <div className="card-premium card-premium-hover rounded-2xl p-5 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-success/25 to-success/10 border border-success/20 flex items-center justify-center shrink-0">
                                <DollarSign className="h-5 w-5 text-success" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/70">Estimated Cost</p>
                                <p className="font-semibold text-foreground tabular-nums mt-0.5">{cost}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Phases with Features */}
            {isPhaseFormat ? (
                phases.map((phase: any, pi: number) => (
                    <div key={pi} className="card-premium rounded-2xl p-6 overflow-hidden">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center text-sm font-bold font-mono text-brand-cyan">
                                {pi + 1}
                            </div>
                            <h2 className="font-semibold text-base">{phase.phase}</h2>
                        </div>
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-3">
                            {(phase.features || []).map((feature: any, fi: number) => (
                                <motion.div
                                    key={fi}
                                    variants={itemVariants}
                                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/25 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="space-y-1 max-w-xl">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-foreground">{feature.feature_name || feature.name || "Feature"}</h3>
                                            {feature.ai_capability && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-violet/10 text-brand-violet border border-brand-violet/25">
                                                    {feature.ai_capability}
                                                </span>
                                            )}
                                            {feature.effort && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-muted-foreground border border-white/10">
                                                    {feature.effort}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description || feature.problem_solved || ""}</p>
                                        {feature.business_value && (
                                            <p className="text-xs text-muted-foreground/70 italic">{feature.business_value}</p>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 mb-1">Priority</p>
                                        <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full", priorityBadge(feature.priority))}>
                                            {feature.priority || "N/A"}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                ))
            ) : (
                /* Flat features fallback */
                <div className="card-premium rounded-2xl p-6 overflow-hidden">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-brand-cyan" />
                        </div>
                        <h2 className="font-semibold text-base">Core Feature Set</h2>
                    </div>
                    <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-3">
                        {allFeatures.map((feature: any, i: number) => (
                            <motion.div
                                key={i}
                                variants={itemVariants}
                                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand/25 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1 max-w-xl">
                                    <h3 className="font-semibold text-foreground">{feature.feature_name || feature.name || "Feature"}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description || feature.problem_solved || ""}</p>
                                </div>
                                <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0", priorityBadge(feature.priority))}>
                                    {feature.priority || "N/A"}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            )}

            {/* Tech Stack */}
            {techStack && Object.keys(techStack).length > 0 && (
                <div className="card-premium rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-violet/25 to-brand-fuchsia/15 border border-brand-violet/20 flex items-center justify-center">
                            <Code2 className="h-4 w-4 text-brand-violet" />
                        </div>
                        <h2 className="font-semibold text-base">Recommended Tech Stack</h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(techStack).filter(([k]) => k !== "reasoning").map(([key, val]) => (
                            <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-brand-cyan/80 w-20 shrink-0">{key}</span>
                                <span className="text-sm text-foreground font-medium">{String(val)}</span>
                            </div>
                        ))}
                    </div>
                    {techStack.reasoning && (
                        <p className="text-sm text-muted-foreground mt-4 italic leading-relaxed">{techStack.reasoning}</p>
                    )}
                </div>
            )}

            {/* Success Metrics */}
            {successMetrics.length > 0 && (
                <div className="card-premium rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-success/25 to-success/10 border border-success/20 flex items-center justify-center">
                            <Gauge className="h-4 w-4 text-success" />
                        </div>
                        <h2 className="font-semibold text-base">Success Metrics</h2>
                    </div>
                    <motion.div variants={listVariants} initial="hidden" animate="show" className="grid gap-3">
                        {successMetrics.map((m: any, i: number) => (
                            <motion.div key={i} variants={itemVariants} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <span className="font-medium text-foreground text-sm">{m.metric}</span>
                                    <span className="text-[10px] font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/25 shrink-0">
                                        {m.target}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{m.why}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
                <Link href={`/dashboard/idea/${params.id}/monetization`} className="w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" size="lg">
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                </Link>
                <Link href={`/dashboard/idea/${params.id}/gtm`} className="w-full sm:w-auto">
                    <Button className="gap-2 w-full rounded-xl bg-primary hover:bg-primary/90 glow-primary shimmer press" size="lg">
                        Next: GTM Strategy <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}
