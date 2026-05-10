"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

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
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        )
    }

    if (!idea || !idea.analysis_data || !idea.analysis_data.monetization) {
        return (
            <div className="text-center py-20 text-foreground">
                <h2 className="text-2xl font-bold">Monetization Analysis not found</h2>
            </div>
        )
    }

    const monetization = idea.analysis_data?.monetization || {}

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Monetization Strategy
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Revenue models and pricing strategy for {idea.title}.
                    </p>
                </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <CreditCard className="h-5 w-5 text-primary" /> Revenue Model
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm text-foreground">Pricing Model</h3>
                            <p className="text-sm text-muted-foreground">{monetization.pricing_model || "N/A"}</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm text-foreground">Conversion Logic</h3>
                            <p className="text-sm text-muted-foreground">{monetization.conversion_logic || "N/A"}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-foreground">Recommended Plans</h3>
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {(monetization.plans || []).map((plan: any, i: number) => (
                                <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm">{plan.name || "Plan"}</h4>
                                        <Badge variant="outline" className="text-[10px]">{plan.price || "N/A"}</Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-3 leading-tight">{plan.target}</p>
                                    <ul className="space-y-1">
                                        {(plan.features || []).map((f: string, j: number) => (
                                            <li key={j} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <div className="h-1 w-1 rounded-full bg-primary shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            {(!monetization.plans || monetization.plans.length === 0) && (
                                <p className="text-sm text-muted-foreground italic">No plans data available.</p>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <h3 className="font-semibold text-xs text-primary uppercase tracking-wider mb-1">Recommended Strategy</h3>
                        <p className="text-sm text-foreground leading-relaxed italic">
                            "{monetization.recommended_strategy || "Strategy not available."}"
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 pb-8">
                <Link href={`/dashboard/idea/${params.id}/competitors`} className="w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 w-full" size="lg">
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                </Link>
                <Link href={`/dashboard/idea/${params.id}/mvp-blueprint`} className="w-full sm:w-auto">
                    <Button className="gap-2 w-full" size="lg">
                        Next: MVP Blueprint <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}
