"use client"

import { useEffect, useState, useRef } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CoFounderChat } from "@/components/co-founder-chat"

import { useRefineContext, RefineContext } from "./refine-context"

interface TextSelectionTooltipProps {
    ideaId: number
    section: string
    sectionName: string
    onUpdate: (newData: any) => void
    currentData?: any
    children: React.ReactNode
}

export function TextSelectionTooltip({
    ideaId,
    section,
    sectionName,
    currentData,
    onUpdate,
    children
}: TextSelectionTooltipProps) {
    const [selection, setSelection] = useState<Selection | null>(null)
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [selectedText, setSelectedText] = useState("")
    const [isPending, setIsPending] = useState(false)
    const [originalData, setOriginalData] = useState<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleSelectionChange = () => {
            if (isChatOpen || isPending) return

            const openSelection = window.getSelection()
            if (!openSelection || openSelection.isCollapsed) {
                setSelection(null)
                setPosition(null)
                return
            }

            // Only show tooltip if selection is inside THIS container
            if (containerRef.current && containerRef.current.contains(openSelection.anchorNode)) {
                const range = openSelection.getRangeAt(0)
                const rect = range.getBoundingClientRect()

                setSelection(openSelection)
                setSelectedText(openSelection.toString())
                setPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10
                })
            } else {
                setSelection(null)
                setPosition(null)
            }
        }

        document.addEventListener("selectionchange", handleSelectionChange)
        document.addEventListener("mouseup", handleSelectionChange)

        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange)
            document.removeEventListener("mouseup", handleSelectionChange)
        }
    }, [isChatOpen, isPending])

    const handleRefineClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsChatOpen(true)
        if (window.getSelection()) {
            window.getSelection()?.removeAllRanges()
        }
        setSelection(null)
        setPosition(null)
    }

    const handlePreviewUpdate = (newData: any) => {
        if (!isPending) {
            setOriginalData(currentData)
        }
        setIsPending(true)
        onUpdate(newData)
    }

    const handleConfirm = async () => {
        try {
            await import("@/lib/api").then(async ({ apiFetch }) => {
                await apiFetch(`/ideas/${ideaId}/section`, {
                    method: "PUT",
                    body: JSON.stringify({
                        section: section,
                        data: currentData
                    })
                })
            })
            setIsPending(false)
            setOriginalData(null)
        } catch (error) {
            console.error("Failed to save changes", error)
        }
    }

    const handleReject = () => {
        if (originalData) {
            onUpdate(originalData)
        }
        setIsPending(false)
        setOriginalData(null)
    }

    return (
        <RefineContext.Provider value={{
            originalData: originalData || currentData, // If not pending, match current
            currentData,
            isPending,
            confirmChanges: handleConfirm,
            rejectChanges: handleReject
        }}>
            <div
                ref={containerRef}
                className="relative"
            >
                {/* Global indicator only if pending but we rely on local Refinable components for diffs */}
                {/* We removed the global red overlay */}

                {children}

                {position && !isChatOpen && !isPending && (
                    <div
                        className="fixed z-50 transform -translate-x-1/2 -translate-y-full px-2"
                        style={{
                            left: position.x,
                            top: position.y
                        }}
                    >
                        <Button
                            size="sm"
                            onClick={handleRefineClick}
                            className="shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-full animate-in fade-in zoom-in duration-200"
                        >
                            <Sparkles className="h-3 w-3" />
                            Refine with AI
                        </Button>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-indigo-600 border-r-[6px] border-r-transparent mx-auto" />
                    </div>
                )}

                <CoFounderChat
                    ideaId={ideaId}
                    section={section}
                    sectionName={sectionName}
                    onUpdate={handlePreviewUpdate}
                    isOpenExternal={isChatOpen}
                    setIsOpenExternal={setIsChatOpen}
                    initialContext={selectedText}
                    mode={isPending ? "preview" : "edit"}
                />
            </div>
        </RefineContext.Provider>
    )
}
