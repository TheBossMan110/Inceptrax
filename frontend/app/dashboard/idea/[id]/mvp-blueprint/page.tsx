"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Loader2, ArrowLeft, ArrowRight, Clock, DollarSign, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

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
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        )
    }

    if (!idea || !idea.analysis_data) {
        return (
            <div className="text-center py-20 text-foreground">
                <h2 className="text-2xl font-bold">MVP Blueprint not found</h2>
                <p className="text-muted-foreground mt-2">Please run the analysis first.</p>
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
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        MVP Blueprint
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Minimum Viable Product roadmap for {idea.title}.
                    </p>
                </div>
            </div>

            {/* Core Hypothesis */}
            {coreHypothesis && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Core Hypothesis</p>
                        <p className="text-foreground font-medium">{coreHypothesis}</p>
                    </CardContent>
                </Card>
            )}

            {/* Timeline & Cost */}
            {(timeline || cost) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {timeline && (
                        <Card>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Timeline</p>
                                    <p className="font-semibold text-foreground">{timeline}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {cost && (
                        <Card>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                                    <p className="font-semibold text-foreground">{cost}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Phases with Features */}
            {isPhaseFormat ? (
                phases.map((phase: any, pi: number) => (
                    <Card key={pi} className="border-none shadow-sm overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {pi + 1}
                                </div>
                                {phase.phase}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {(phase.features || []).map((feature: any, fi: number) => (
                                    <div key={fi} className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1 max-w-xl">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-foreground">{feature.feature_name || feature.name || "Feature"}</h3>
                                                {feature.ai_capability && (
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-primary/10 text-primary border-none">
                                                        {feature.ai_capability}
                                                    </Badge>
                                                )}
                                                {feature.effort && (
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2">
                                                        {feature.effort}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{feature.description || feature.problem_solved || ""}</p>
                                            {feature.business_value && (
                                                <p className="text-xs text-muted-foreground/70 italic">{feature.business_value}</p>
                                            )}
                                        </div>
                                        <div className="shrink-0">
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Priority</p>
                                            <Badge variant={feature.priority === "Must-have" ? "default" : "outline"} className="text-[10px]">
                                                {feature.priority || "N/A"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                /* Flat features fallback */
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Zap className="h-5 w-5 text-primary" /> Core Feature Set
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            {allFeatures.map((feature: any, i: number) => (
                                <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1 max-w-xl">
                                        <h3 className="font-bold text-foreground">{feature.feature_name || feature.name || "Feature"}</h3>
                                        <p className="text-sm text-muted-foreground">{feature.description || feature.problem_solved || ""}</p>
                                    </div>
                                    <Badge variant={feature.priority === "Must-have" ? "default" : "outline"} className="text-[10px]">
                                        {feature.priority || "N/A"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tech Stack */}
            {techStack && Object.keys(techStack).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Code2 className="h-5 w-5 text-primary" /> Recommended Tech Stack
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-2">
                            {Object.entries(techStack).filter(([k]) => k !== "reasoning").map(([key, val]) => (
                                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                    <span className="text-xs uppercase text-muted-foreground font-medium w-20">{key}</span>
                                    <span className="text-sm text-foreground font-medium">{String(val)}</span>
                                </div>
                            ))}
                        </div>
                        {techStack.reasoning && (
                            <p className="text-sm text-muted-foreground mt-4 italic">{techStack.reasoning}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Success Metrics */}
            {successMetrics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">Success Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3">
                            {successMetrics.map((m: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-foreground text-sm">{m.metric}</span>
                                        <Badge variant="secondary" className="text-[10px]">{m.target}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{m.why}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between pt-4 pb-8">
                <Link href={`/dashboard/idea/${params.id}/monetization`}>
                    <Button variant="outline" className="gap-2 pl-6 pr-6" size="lg">
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                </Link>
                <Link href={`/dashboard/idea/${params.id}/gtm`}>
                    <Button className="gap-2 pl-6 pr-6" size="lg">
                        Next: GTM Strategy <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div >
    )
}
