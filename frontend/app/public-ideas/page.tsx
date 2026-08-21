"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Eye, Trophy, Award } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Aurora, Reveal, RevealGroup, RevealItem, SpotlightCard } from "@/components/fx"

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

const RANKS = [
    { label: "01", icon: Trophy, chip: "bg-warning/10 border-warning/25 text-warning" },
    { label: "02", icon: Award, chip: "bg-white/[0.05] border-white/15 text-foreground/70" },
    { label: "03", icon: Award, chip: "bg-brand/10 border-brand/25 text-brand-cyan" },
]

function scoreBadgeClass(score: number) {
    if (score >= 70) return "bg-success/10 text-success border-success/25"
    if (score >= 40) return "bg-warning/10 text-warning border-warning/25"
    return "bg-danger/10 text-danger border-danger/25"
}

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

            <main className="flex-grow">
                {/* ── Hero ─────────────────────────────────────── */}
                <section className="relative pt-36 pb-14 md:pt-44 md:pb-16 overflow-hidden">
                    <Aurora />
                    <div className="container px-4 relative z-10 max-w-3xl mx-auto text-center">
                        <Reveal>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[11px] font-mono uppercase tracking-[0.18em] text-brand-cyan mb-6">
                                <Trophy className="h-3.5 w-3.5" /> Top Ideas
                            </div>
                        </Reveal>
                        <Reveal delay={0.08}>
                            <h1 className="text-balance mb-6 text-gradient-subtle">
                                Most Viewed Ideas.
                                <br />
                                <span className="accent-serif text-gradient glow-text">Community Favorites.</span>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.16}>
                            <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
                                The top 3 most-viewed startup ideas on Inceptrax — validated by AI, popular with founders.
                            </p>
                        </Reveal>
                    </div>
                </section>

                {/* ── Idea cards ───────────────────────────────── */}
                <section className="pb-16 md:pb-20">
                    <div className="container px-4 max-w-6xl mx-auto">
                        {isLoading ? (
                            <div className="grid gap-5 md:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="card-premium rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="skeleton h-7 w-16 rounded-full" />
                                            <div className="skeleton h-6 w-14 rounded-full" />
                                        </div>
                                        <div className="skeleton h-7 w-3/4" />
                                        <div className="skeleton h-3.5 w-1/2" />
                                        <div className="space-y-2">
                                            <div className="skeleton h-3.5 w-full" />
                                            <div className="skeleton h-3.5 w-full" />
                                            <div className="skeleton h-3.5 w-2/3" />
                                        </div>
                                        <div className="skeleton h-11 w-full rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        ) : ideas.length > 0 ? (
                            <RevealGroup className="grid gap-5 md:grid-cols-3">
                                {ideas.map((idea, index) => {
                                    const rank = RANKS[index] || RANKS[2]
                                    return (
                                        <RevealItem key={idea.id}>
                                            <SpotlightCard className="p-6 h-full card-premium-hover">
                                                <div className="flex items-start justify-between gap-3 mb-5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold ${rank.chip}`}>
                                                            <rank.icon className="h-3.5 w-3.5" /> {rank.label}
                                                        </span>
                                                        {index === 0 && (
                                                            <span className="glass rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                                                Most Viewed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${scoreBadgeClass(idea.overall_score || 0)}`}>
                                                        {idea.overall_score || 0}%
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-semibold tracking-tight leading-snug line-clamp-2 mb-2.5">
                                                    {idea.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground/70 mb-4">
                                                    <span className="flex items-center gap-1.5">
                                                        <Eye className="h-3 w-3" />
                                                        {(idea as any).public_views?.toLocaleString() || 0} views
                                                    </span>
                                                    <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                                                </div>

                                                <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed mb-6">
                                                    {idea.description}
                                                </p>

                                                <Button
                                                    className="w-full h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press"
                                                    asChild
                                                >
                                                    <Link href={`/share/${idea.share_token}`}>
                                                        Investigate Idea <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </SpotlightCard>
                                        </RevealItem>
                                    )
                                })}
                            </RevealGroup>
                        ) : (
                            <Reveal>
                                <div className="card-premium rounded-2xl py-16 px-6 text-center max-w-2xl mx-auto">
                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-6">
                                        <Trophy className="h-6 w-6 text-brand-cyan" />
                                    </div>
                                    <h3 className="text-2xl font-semibold tracking-tight mb-2">No public ideas yet</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                                        Be the first to publish your validated idea and make it to the leaderboard!
                                    </p>
                                    <Button
                                        className="h-11 rounded-xl px-8 gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press"
                                        asChild
                                    >
                                        <Link href="/dashboard/new-idea">Validate Your Idea</Link>
                                    </Button>
                                </div>
                            </Reveal>
                        )}
                    </div>
                </section>

                {/* ── Final CTA ────────────────────────────────── */}
                <section className="pb-20 md:pb-24 px-4">
                    <Reveal className="container max-w-4xl mx-auto">
                        <div className="relative rounded-3xl border-gradient overflow-hidden text-center px-6 py-16 md:py-20">
                            <Aurora grid={false} />
                            <div className="relative z-10">
                                <p className="eyebrow mb-5">Join the leaderboard</p>
                                <h2 className="mb-4 text-gradient-subtle">
                                    Your ideas deserve to be{" "}
                                    <span className="accent-serif text-gradient">built.</span>
                                </h2>
                                <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10">
                                    Join 5,000+ founders using Inceptrax to validate, plan, and launch their startups.
                                </p>
                                <Button
                                    size="lg"
                                    className="h-13 px-10 text-base rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press w-full sm:w-auto"
                                    asChild
                                >
                                    <Link href={"/dashboard"}>
                                        Get Started Now <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </Reveal>
                </section>
            </main>

            <Footer />
        </div>
    )
}
