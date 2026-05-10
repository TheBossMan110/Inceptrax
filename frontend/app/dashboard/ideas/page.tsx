"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
        )
    }

    return (
        <>
        <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Ideas</h1>
                    <p className="text-muted-foreground mt-1">Manage all your startup concepts and validation reports.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="secondary"
                        className="rounded-xl gap-2 font-semibold"
                        onClick={handleExportAll}
                        disabled={isExporting || ideas.length === 0}
                    >
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export All Reports
                    </Button>
                    <Button asChild className="rounded-xl gap-2 font-semibold">
                        <Link href="/dashboard/new-idea">
                            <Plus className="h-5 w-5" /> New Idea
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filter your ideas..."
                    className="pl-10 h-11 rounded-xl bg-card border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredIdeas.length > 0 ? (
                    filteredIdeas.map((idea) => (
                        <Card key={idea.id} className={`border-none shadow-sm hover:shadow-md transition-shadow group bg-card/50 overflow-hidden flex flex-col ${
                            idea.status === 'failed' ? 'ring-2 ring-red-200 dark:ring-red-900/50' : idea.status === 'processing' ? 'ring-2 ring-amber-200 dark:ring-amber-900/50' : ''
                        }`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                        idea.status === 'failed'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                                            : idea.status === 'processing'
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                            : 'bg-primary/10 text-primary'
                                    }`}>
                                        {idea.status === 'processing' ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : idea.status === 'failed' ? (
                                            <AlertTriangle className="h-5 w-5" />
                                        ) : (
                                            <Lightbulb className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="text-right mr-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Score</div>
                                            <div className="text-xl font-bold text-primary">{idea.overall_score || 0}%</div>
                                        </div>

                                        {/* Delete button */}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                    disabled={isDeleting === idea.id}
                                                >
                                                    {isDeleting === idea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-background border-border rounded-2xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently remove &quot;{idea.title}&quot; and all associated analysis data from our servers.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
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

                                <CardTitle className="text-xl text-foreground line-clamp-1 group-hover:text-primary transition-colors text-ellipsis overflow-hidden">
                                    {idea.title}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">
                                        Created {new Date(idea.created_at).toLocaleDateString()}
                                    </span>
                                    {idea.status === 'processing' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Processing
                                        </span>
                                    )}
                                    {idea.status === 'failed' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                            <AlertTriangle className="h-3 w-3" /> Failed
                                        </span>
                                    )}
                                    {(idea.ai_layers_count ?? 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                                            <Sparkles className="h-3 w-3" /> AI-Refined ✓
                                        </span>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="flex flex-col flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
                                    {idea.description}
                                </p>

                                {/* Visibility toggle row */}
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <button
                                        onClick={() => handleToggleVisibility(idea)}
                                        disabled={isTogglingVisibility === idea.id}
                                        className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 select-none
                                            ${idea.is_public
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400"
                                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
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
                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/5"
                                        >
                                            {copiedId === idea.id ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
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
                                    {idea.status === 'failed' ? (
                                        <Button
                                            className="flex-1 rounded-xl gap-2 h-10 bg-red-600 hover:bg-red-700 text-white"
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
                                    ) : idea.status === 'processing' ? (
                                        <Button variant="outline" className="flex-1 rounded-xl gap-2 bg-transparent border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 h-10" asChild>
                                            <Link href={`/dashboard/idea/${idea.id}/progress`}>
                                                <Loader2 className="h-4 w-4 animate-spin" /> View Progress
                                            </Link>
                                        </Button>
                                    ) : (
                                        <>
                                            <Button variant="outline" className="flex-1 rounded-xl gap-2 bg-transparent border-primary/20 text-primary hover:bg-primary/5 h-10" asChild>
                                                <Link href={`/dashboard/idea/${idea.id}/validation`}>
                                                    View <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            {idea.overall_score && idea.overall_score > 0 ? (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-xl"
                                                        onClick={() => handleDownloadPdf(idea.id, idea.title)}
                                                        disabled={isDownloading === idea.id}
                                                        title="Download PDF Report"
                                                    >
                                                        {isDownloading === idea.id
                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                            : <Download className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-xl"
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
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                            <Search className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold">No ideas found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or create a new concept.</p>
                    </div>
                )}
            </div>
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

