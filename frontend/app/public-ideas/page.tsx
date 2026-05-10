"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2, Eye } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { cn } from "@/lib/utils"
interface PublicIdea {
    id: number;
    title: string;
    description: string;
    created_at: string;
    overall_score: number;
    share_token: string;
    industry: string;
    public_views: number;
    founder_name: string;
    founder_initial: string;
}

const RANK_LABELS = ["🥇", "🥈", "🥉"]

export default function PublicIdeasGallery() {
    const [ideas, setIdeas] = useState<PublicIdea[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchTopIdeas() {
            try {
                const response = await apiFetch("/ideas/public?sort=most_viewed&per_page=3&page=1")
                const sorted = (response.data.ideas || []).sort((a: any, b: any) => 
                    (b.public_views || 0) - (a.public_views || 0)
                ).slice(0, 3)
                setIdeas(sorted)
            } catch (error) {
                console.error("Failed to fetch public ideas:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchTopIdeas()
    }, [])



    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="flex-grow pt-24 pb-16 px-4">
                <div className="max-w-6xl mx-auto space-y-16">
                    {/* Hero Section - High Contrast B&W */}
                    <div className="text-center space-y-6 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                           🏆 Top Ideas
                        </div>
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
                            Most Viewed Ideas.<br />
                            <span className="text-muted-foreground">Community Favorites.</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium">
                            The top 3 most-viewed startup ideas on Inceptrax — validated by AI, popular with founders.
                        </p>
                    </div>



                    {isLoading ? (
                        <div className="flex h-[40vh] items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-foreground" />
                        </div>
                    ) : ideas.length > 0 ? (
                        <div className="grid gap-8 md:grid-cols-3">
                            {ideas.map((idea, index) => (
                                <Card key={idea.id} className="border-2 border-border shadow-none hover:border-primary transition-all duration-300 group bg-card overflow-hidden flex flex-col rounded-3xl">
                                    <CardHeader className="pb-4 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="text-3xl">{RANK_LABELS[index] || ""}</span>
                                                {index === 0 && <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border rounded-full px-2 py-0.5">Most Viewed</span>}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Score</div>
                                                <div className="text-3xl font-black text-foreground tabular-nums">{idea.overall_score || 0}%</div>
                                            </div>
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black text-foreground line-clamp-2 leading-tight">
                                                {idea.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    <Eye className="h-3 w-3" />
                                                    <span>{(idea as any).public_views?.toLocaleString() || 0} views</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    {new Date(idea.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-col flex-grow space-y-8 pt-0">
                                        <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed font-medium">
                                            {idea.description}
                                        </p>
                                        <Button className="w-full rounded-2xl gap-3 h-14 font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/5" asChild>
                                            <Link href={`/share/${idea.share_token}`}>
                                                Investigate Idea <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 text-center space-y-6 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-border max-w-4xl mx-auto">
                            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground border-2 border-border">
                                🏆
                            </div>
                            <div className="space-y-2 px-4">
                                <h3 className="text-3xl font-black tracking-tight">No public ideas yet</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto font-medium">Be the first to publish your validated idea and make it to the leaderboard!</p>
                            </div>
                            <Button className="rounded-2xl px-10 h-12 font-bold" asChild>
                                <Link href="/dashboard/new-idea">Validate Your Idea</Link>
                            </Button>
                        </div>
                    )}

                    {/* Footer CTA */}
                    <div className="rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-16 text-center bg-primary text-primary-foreground mt-24">
                        <div className="max-w-2xl mx-auto space-y-8">
                            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter">Your ideas deserve to be built.</h2>
                            <p className="text-primary-foreground/80 text-lg font-medium">
                                Join 5,000+ founders using Inceptrax to validate, plan, and launch their startups.
                            </p>
                            <Button size="lg" className="rounded-2xl px-12 h-16 text-lg font-black bg-background text-foreground hover:bg-background/90 transition-all uppercase tracking-widest shadow-2xl" asChild>
                                <Link href={"/dashboard"}>Get Started Now</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

