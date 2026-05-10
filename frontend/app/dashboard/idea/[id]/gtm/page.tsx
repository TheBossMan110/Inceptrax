"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Loader2, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

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
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        )
    }

    if (!idea || !idea.analysis_data || !idea.analysis_data.gtm_strategy) {
        return (
            <div className="text-center py-20 text-foreground">
                <h2 className="text-2xl font-bold">GTM Strategy not found</h2>
            </div>
        )
    }

    const gtm = idea.analysis_data?.gtm_strategy || {}

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Go-To-Market Strategy
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Launch and acquisition strategy for {idea.title}.
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Rocket className="h-5 w-5 text-accent" /> Acquisition Channels
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(gtm.acquisition_channels || []).map((ac: any, i: number) => (
                            <div key={i} className="space-y-1 p-3 rounded-lg bg-muted/20">
                                <h4 className="font-semibold text-sm text-foreground">{ac.channel || "Channel"}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">{ac.strategy}</p>
                            </div>
                        ))}
                        {(!gtm.acquisition_channels || gtm.acquisition_channels.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">No acquisition channels data available.</p>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Funnel Strategy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-1 bg-border h-4" />
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <div className="w-1 bg-border h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Awareness</h4>
                                    <p className="text-sm text-foreground">{gtm.funnel_stages?.awareness || "N/A"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-1 bg-border h-4" />
                                    <div className="w-2 h-2 rounded-full bg-secondary" />
                                    <div className="w-1 bg-border h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Activation</h4>
                                    <p className="text-sm text-foreground">{gtm.funnel_stages?.activation || "N/A"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-1 bg-border h-4" />
                                    <div className="w-2 h-2 rounded-full bg-accent" />
                                    <div className="w-1 bg-border h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Conversion</h4>
                                    <p className="text-sm text-foreground">{gtm.funnel_stages?.conversion || "N/A"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-accent/10 border-accent/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-black tracking-widest">
                                Early Traction (First 1,000 Users)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-foreground leading-relaxed">
                                {gtm.early_traction || "Plan to be announced."}
                            </p>
                        </CardContent>
                    </Card>

                </div>
            </div>


            <div className="flex justify-between pt-4 pb-8">
                <Link href={`/dashboard/idea/${params.id}/mvp-blueprint`}>
                    <Button variant="outline" className="gap-2 pl-6 pr-6" size="lg">
                        <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                </Link>
                <Link href={`/dashboard/idea/${params.id}/investor`}>
                    <Button className="gap-2 pl-6 pr-6" size="lg">
                        Next: Investor Pitches <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div >
    )
}
