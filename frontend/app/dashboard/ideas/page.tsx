"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ArrowRight, Loader2, Lightbulb, Search, Globe, Lock, Link2, Check, Download, Sparkles, Presentation, AlertTriangle, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { ExportModal } from "@/components/export-modal"
import { PdfExportModal } from "@/components/pdf-export-modal"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
}

const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

/** Score as a designed number rather than a chip — colour only, no box. */
function scoreTextClass(score: number) {
    if (score >= 75) return "text-success"
    if (score >= 50) return "text-warning"
    return "text-danger"
}

interface Idea {
    id: number;
    title: string;
    description: string;
    created_at: string;
    overall_score: number;
    is_public: boolean;
    share_token: string | null;
    ai_layers_count?: number;
    status?: string;
}

export default function IdeasPage() {
    const [ideas, setIdeas] = useState<Idea[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const [isTogglingVisibility, setIsTogglingVisibility] = useState<number | null>(null)
    const [copiedId, setCopiedId] = useState<number | null>(null)
    
    // Export states
    const [isDownloading, setIsDownloading] = useState<number | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [exportModalId, setExportModalId] = useState<{ id: number; title: string } | null>(null)
    const [pdfExportModalId, setPdfExportModalId] = useState<{ id: number; title: string } | null>(null)
    const [retryingId, setRetryingId] = useState<number | null>(null)
    const router = useRouter()

    useEffect(() => {
        async function fetchIdeas() {
            try {
                const response = await apiFetch("/ideas/")
                setIdeas(response.data.ideas)
            } catch (error) {
                console.error("Failed to fetch ideas:", error)
                toast.error("Failed to load ideas")
            } finally {
                setIsLoading(false)
            }
        }
        fetchIdeas()
    }, [])

    const handleDelete = async (ideaId: number) => {
        setIsDeleting(ideaId)
        try {
            await apiFetch(`/ideas/${ideaId}`, { method: "DELETE" })
            setIdeas(prev => prev.filter(idea => idea.id !== ideaId))
            toast.success("Idea deleted successfully")
        } catch (error: any) {
            toast.error(error.message || "Failed to delete idea")
        } finally {
            setIsDeleting(null)
        }
    }

    const handleToggleVisibility = async (idea: Idea) => {
        setIsTogglingVisibility(idea.id)
        try {
            const response = await apiFetch(`/ideas/${idea.id}/visibility`, {
                method: "PATCH",
                body: JSON.stringify({ is_public: !idea.is_public }),
            })
            const updated: Idea = response.data.idea
            setIdeas(prev => prev.map(i => i.id === idea.id ? updated : i))
            toast.success(updated.is_public ? "Idea is now public — share link is ready!" : "Idea is now private")
        } catch (error: any) {
            toast.error(error.message || "Failed to update visibility")
        } finally {
            setIsTogglingVisibility(null)
        }
    }

    const handleCopyLink = async (idea: Idea) => {
        if (!idea.share_token) return
        const shareUrl = `${window.location.origin}/share/${idea.share_token}`
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopiedId(idea.id)
            toast.success("Share link copied to clipboard!")
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error("Failed to copy link")
        }
    }

    const handleDownloadPdf = (ideaId: number, title: string) => {
        setPdfExportModalId({ id: ideaId, title })
    }

    const handleRetry = async (ideaId: number) => {
        setRetryingId(ideaId)
        try {
            await apiFetch(`/ideas/${ideaId}/reanalyze`, { method: "POST" })
            toast.success("Re-analysis started!")
            setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: "processing" } : i))
            setTimeout(() => router.push(`/dashboard/idea/${ideaId}/progress`), 500)
        } catch (err: any) {
            toast.error(err.message || "Failed to retry analysis")
        } finally {
            setRetryingId(null)
        }
    }

    const handleExportAll = async () => {
        if (ideas.length === 0) {
            toast.error("No ideas to export")
            return
        }
        setIsExporting(true)
        try {
            let exportedCount = 0
            const zip = new JSZip()
            
            for (const idea of ideas) {
                // Only try to export if it has a validation score (meaning a report exists)
                if (idea.overall_score && idea.overall_score > 0) {
                    try {
                        const blob: Blob = await apiFetch(`/ideas/${idea.id}/download`)
                        zip.file(`${idea.title.replace(/\s+/g, '-')}-Analysis.pdf`, blob)
                        exportedCount++
                    } catch (e) {
                        console.warn('Skipping idea without pdf', idea.id)
                    }
                }
            }
            
            if (exportedCount === 0) {
                toast.error("No valid reports found to export. Validate an idea first.")
                return
            }

            const content = await zip.generateAsync({ type: "blob" })
            saveAs(content, "All_Idea_Reports.zip")
            toast.success(`${exportedCount} reports exported successfully!`)
        } catch (error: any) {
            toast.error(error.message || "Failed to export reports")
        } finally {
            setIsExporting(false)
        }
    }

    const filteredIdeas = ideas.filter(idea =>
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="space-y-8 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                    <div className="space-y-3">
                        <div className="skeleton h-3 w-20" />
                        <div className="skeleton h-9 w-52" />
                        <div className="skeleton h-4 w-72" />
                    </div>
                    <div className="flex gap-2">
                        <div className="skeleton h-11 w-44 rounded-xl" />
                        <div className="skeleton h-11 w-32 rounded-xl" />
                    </div>
                </div>
                <div className="skeleton h-11 w-full max-w-md rounded-xl" />
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card-premium rounded-2xl p-5 sm:p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="skeleton h-11 w-11 rounded-xl" />
                                <div className="skeleton h-9 w-14" />
                            </div>
                            <div className="skeleton h-5 w-3/4" />
                            <div className="skeleton h-3 w-full" />
                            <div className="skeleton h-3 w-2/3" />
                            <div className="skeleton h-px w-full" />
                            <div className="skeleton h-10 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <>
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-up">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div className="min-w-0">
                    <p className="eyebrow mb-3">Library</p>
                    <h1 className="text-[1.75rem] md:text-4xl font-semibold tracking-[-0.03em] leading-[1.08] text-gradient-subtle">
                        My <span className="accent-serif text-gradient">Ideas</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2.5 max-w-md leading-relaxed">
                        Manage all your startup concepts and validation reports.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        className="h-11 rounded-xl gap-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
                        onClick={handleExportAll}
                        disabled={isExporting || ideas.length === 0}
                    >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export All Reports
                    </Button>
                    <Button asChild className="h-11 px-5 rounded-xl gap-2 font-semibold bg-primary hover:bg-primary/90 glow-primary shimmer press">
                        <Link href="/dashboard/new-idea">
                            <Plus className="h-4 w-4" /> New Idea
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                    <Input
                        placeholder="Filter your ideas..."
                        className="pl-10 h-11 rounded-xl bg-white/[0.03] border-white/[0.08] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] focus-visible:border-brand/40"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {ideas.length > 0 && (
                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/60 tabular-nums shrink-0">
                        {filteredIdeas.length} of {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
                    </p>
                )}
            </div>

            <motion.div
                variants={gridVariants}
                initial="hidden"
                animate="show"
                className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            >
                {filteredIdeas.length > 0 ? (
                    filteredIdeas.map((idea) => {
                        const isProcessing = idea.status === 'processing'
                        const isFailed = idea.status === 'failed'
                        const score = idea.overall_score || 0

                        return (
                        <motion.div key={idea.id} variants={cardVariants} className="flex">
                        <article className={`group relative flex w-full flex-col overflow-hidden rounded-2xl card-premium card-premium-hover shadow-[0_24px_60px_-40px_oklch(0_0_0_/_0.9)] ${
                            isFailed ? 'border-danger/25' : isProcessing ? 'border-warning/25' : ''
                        }`}>
                            {/* Status accent along the top edge */}
                            {(isProcessing || isFailed) && (
                                <span
                                    aria-hidden
                                    className={`absolute inset-x-0 top-0 h-px ${
                                        isFailed
                                            ? 'bg-gradient-to-r from-transparent via-danger/70 to-transparent'
                                            : 'bg-gradient-to-r from-transparent via-warning/70 to-transparent'
                                    }`}
                                />
                            )}

                            <div className="flex flex-col flex-grow p-5 sm:p-6">
                                {/* Icon + score + delete */}
                                <div className="flex justify-between items-start gap-3">
                                    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.09)] ${
                                        isFailed
                                            ? 'bg-danger/10 border-danger/20 text-danger'
                                            : isProcessing
                                            ? 'bg-warning/10 border-warning/20 text-warning'
                                            : 'bg-gradient-to-br from-brand/25 to-brand-violet/15 border-brand/20 text-brand-cyan'
                                    }`}>
                                        {isProcessing ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : isFailed ? (
                                            <AlertTriangle className="h-5 w-5" />
                                        ) : (
                                            <Lightbulb className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div className="flex items-start gap-1 shrink-0">
                                        <div className="text-right mr-1.5">
                                            <div className="text-[9px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/60">Score</div>
                                            {score > 0 ? (
                                                <p className={`mt-1 text-[1.75rem] leading-none font-semibold tabular-nums tracking-[-0.04em] ${scoreTextClass(score)}`}>
                                                    {score}
                                                    <span className="text-xs font-medium align-top ml-0.5 opacity-60">%</span>
                                                </p>
                                            ) : (
                                                <p className="mt-1 text-[1.75rem] leading-none font-semibold tabular-nums tracking-[-0.04em] text-muted-foreground/35">
                                                    —
                                                </p>
                                            )}
                                        </div>

                                        {/* Delete button */}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 -mt-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    disabled={isDeleting === idea.id}
                                                >
                                                    {isDeleting === idea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="card-premium border-white/10 rounded-2xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently remove &quot;{idea.title}&quot; and all associated analysis data from our servers.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07]">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-semibold"
                                                        onClick={() => handleDelete(idea.id)}
                                                    >
                                                        Delete Permanently
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>

                                {/* Title + meta */}
                                <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-foreground line-clamp-1 group-hover:text-brand-cyan transition-colors duration-200">
                                    {idea.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground/80 tabular-nums">
                                        {new Date(idea.created_at).toLocaleDateString()}
                                    </span>
                                    {isProcessing && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 border border-warning/25 px-2 py-0.5 rounded-full">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Processing
                                        </span>
                                    )}
                                    {isFailed && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger bg-danger/10 border border-danger/25 px-2 py-0.5 rounded-full">
                                            <AlertTriangle className="h-3 w-3" /> Failed
                                        </span>
                                    )}
                                    {(idea.ai_layers_count ?? 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-violet bg-brand-violet/10 border border-brand-violet/25 px-2 py-0.5 rounded-full">
                                            <Sparkles className="h-3 w-3" /> AI-Refined
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-3 mt-3.5 flex-grow">
                                    {idea.description}
                                </p>

                                {/* Footer */}
                                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                                    {/* Visibility toggle row */}
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <button
                                            onClick={() => handleToggleVisibility(idea)}
                                            disabled={isTogglingVisibility === idea.id}
                                            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 select-none press
                                                ${idea.is_public
                                                    ? "bg-success/10 text-success border-success/25 hover:bg-success/20"
                                                    : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:bg-white/[0.08]"
                                                }`}
                                        >
                                            {isTogglingVisibility === idea.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : idea.is_public ? (
                                                <Globe className="h-3 w-3" />
                                            ) : (
                                                <Lock className="h-3 w-3" />
                                            )}
                                            {idea.is_public ? "Public" : "Private"}
                                        </button>

                                        {/* Copy link button — only shown when public */}
                                        {idea.is_public && idea.share_token && (
                                            <button
                                                onClick={() => handleCopyLink(idea)}
                                                title="Copy shareable link"
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-cyan transition-colors px-2 py-1.5 rounded-lg hover:bg-brand/10"
                                            >
                                                {copiedId === idea.id ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 text-success" />
                                                        <span className="text-success font-medium">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link2 className="h-3.5 w-3.5" />
                                                        <span>Copy link</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {isFailed ? (
                                            <Button
                                                className="flex-1 rounded-xl gap-2 h-10 bg-danger hover:bg-danger/90 text-white press"
                                                onClick={() => handleRetry(idea.id)}
                                                disabled={retryingId === idea.id}
                                            >
                                                {retryingId === idea.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="h-4 w-4" />
                                                )}
                                                Retry Analysis
                                            </Button>
                                        ) : isProcessing ? (
                                            <Button variant="outline" className="flex-1 rounded-xl gap-2 bg-transparent border-warning/30 text-warning hover:bg-warning/10 hover:text-warning h-10" asChild>
                                                <Link href={`/dashboard/idea/${idea.id}/progress`}>
                                                    <Loader2 className="h-4 w-4 animate-spin" /> View Progress
                                                </Link>
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="outline" className="flex-1 rounded-xl gap-2 bg-transparent border-brand/25 text-brand-cyan hover:bg-brand/10 hover:text-brand-cyan h-10 press" asChild>
                                                    <Link href={`/dashboard/idea/${idea.id}/validation`}>
                                                        View <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {idea.overall_score && idea.overall_score > 0 ? (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-10 w-10 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
                                                            onClick={() => handleDownloadPdf(idea.id, idea.title)}
                                                            disabled={isDownloading === idea.id}
                                                            title="Download PDF Report"
                                                        >
                                                            {isDownloading === idea.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Download className="h-4 w-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-10 w-10 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
                                                            onClick={() => setExportModalId({ id: idea.id, title: idea.title })}
                                                            title="Download PPT Presentation"
                                                        >
                                                            <Presentation className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </article>
                        </motion.div>
                        )
                    })
                ) : ideas.length === 0 ? (
                    /* ── First-run empty state ── */
                    <div className="col-span-full relative card-premium rounded-2xl overflow-hidden py-16 sm:py-20 px-6 flex flex-col items-center text-center shadow-[0_30px_70px_-40px_oklch(0_0_0_/_0.85)]">
                        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" />

                        <div className="relative">
                            <div aria-hidden className="absolute -inset-5 rounded-[2rem] bg-brand/15 blur-2xl" />
                            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-brand/30 to-brand-violet/15 border border-brand/25 flex items-center justify-center shadow-[inset_0_1px_0_oklch(1_0_0_/_0.14)] animate-float">
                                <Lightbulb className="h-7 w-7 text-brand-cyan" />
                            </div>
                        </div>

                        <h3 className="relative mt-7 text-xl font-semibold tracking-tight text-gradient-subtle">
                            Nothing here yet
                        </h3>
                        <p className="relative mt-2.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
                            Every validated startup begins as one sentence. Add your first concept
                            and we&apos;ll return a full analysis in minutes.
                        </p>

                        <Button asChild className="relative mt-6 h-11 px-5 rounded-xl gap-2 font-semibold bg-primary hover:bg-primary/90 glow-primary shimmer press">
                            <Link href="/dashboard/new-idea">
                                <Plus className="h-4 w-4" /> Create your first idea
                            </Link>
                        </Button>

                        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-2">
                            {["Validation score", "Competitor map", "MVP blueprint"].map((chip) => (
                                <span
                                    key={chip}
                                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-muted-foreground"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ── No search matches ── */
                    <div className="col-span-full card-premium rounded-2xl py-16 px-6 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="mt-5 text-lg font-semibold tracking-tight">No matches</h3>
                        <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
                            Nothing matched &ldquo;{searchQuery}&rdquo;. Try a different term, or start something new.
                        </p>
                        <Button asChild variant="outline" className="mt-6 h-10 rounded-xl gap-2 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press">
                            <Link href="/dashboard/new-idea">
                                <Plus className="h-4 w-4" /> New Idea
                            </Link>
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>

        {/* PPT Export Modal */}
        {exportModalId && (
            <ExportModal
                open={!!exportModalId}
                onOpenChange={(open) => { if (!open) setExportModalId(null) }}
                ideaId={exportModalId.id}
                ideaTitle={exportModalId.title}
            />
        )}

        {/* PDF Export Modal */}
        {pdfExportModalId && (
            <PdfExportModal
                open={!!pdfExportModalId}
                onOpenChange={(open) => { if (!open) setPdfExportModalId(null) }}
                ideaId={pdfExportModalId.id}
                ideaTitle={pdfExportModalId.title}
            />
        )}
        </>
    )
}

