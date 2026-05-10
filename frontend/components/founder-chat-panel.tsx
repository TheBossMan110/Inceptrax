"use client"

import { useState, useEffect } from "react"
import { Send, User as UserIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

interface Message {
    id: number
    sender_id: number
    receiver_id: number
    content: string
    is_read: boolean
    created_at: string
}

interface FounderChatPanelProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    recipientId: number | null
    recipientName: string
    currentUserId: number | null
}

export function FounderChatPanel({
    isOpen,
    setIsOpen,
    recipientId,
    recipientName,
    currentUserId,
}: FounderChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingInitial, setIsFetchingInitial] = useState(false)

    // Polling interval
    useEffect(() => {
        if (!isOpen || !recipientId) return

        const fetchMessages = async () => {
            try {
                const res = await apiFetch(`/cofounder/messages/${recipientId}`)
                setMessages(res.data.messages)
            } catch (err) {
                console.error("Failed to fetch messages:", err)
            }
        }

        setIsFetchingInitial(true)
        fetchMessages().finally(() => setIsFetchingInitial(false))

        const interval = setInterval(fetchMessages, 3000)

        // Mark as read
        apiFetch(`/cofounder/messages/${recipientId}/read`, { method: "PUT" }).catch(console.error)

        return () => clearInterval(interval)
    }, [isOpen, recipientId])

    const handleSend = async () => {
        if (!input.trim() || !recipientId) return

        setIsLoading(true)
        const text = input
        setInput("")

        // Optimistic update
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                sender_id: currentUserId || 0,
                receiver_id: recipientId,
                content: text,
                is_read: false,
                created_at: new Date().toISOString(),
            },
        ])

        try {
            await apiFetch(`/cofounder/messages/${recipientId}`, {
                method: "POST",
                body: JSON.stringify({ content: text }),
            })
        } catch (error) {
            toast.error("Failed to send message")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="flex flex-col w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        Chat with {recipientName}
                    </SheetTitle>
                    <SheetDescription>
                        Messages are updated in near real-time.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden bg-slate-50/50 rounded-xl border border-slate-100 p-2">
                    <ScrollArea className="flex-1 pr-4 pl-2">
                        <div className="space-y-4 flex flex-col min-h-full pb-4 pt-2">
                            {isFetchingInitial ? (
                                <div className="flex justify-center items-center h-full text-muted-foreground p-10">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading messages...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-muted-foreground p-10">
                                    No messages yet. Say hi!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUserId
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`flex items-start gap-2 max-w-[80%] ${
                                                    isMe ? "flex-row-reverse" : "flex-row"
                                                }`}
                                            >
                                                <div
                                                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                                        isMe
                                                            ? "bg-indigo-600 text-white"
                                                            : "bg-white text-slate-700 border border-slate-200"
                                                    }`}
                                                >
                                                    <UserIcon className="h-4 w-4" />
                                                </div>
                                                <div
                                                    className={`p-3 rounded-2xl text-sm shadow-sm ${
                                                        isMe
                                                            ? "bg-indigo-600 text-white rounded-tr-sm"
                                                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
                                                    }`}
                                                >
                                                    {msg.content}
                                                    <div className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </ScrollArea>

                    <div className="flex gap-2 pt-2 pb-2 px-1">
                        <Input
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                            disabled={isLoading}
                            className="rounded-xl shadow-sm border-slate-200 focus-visible:ring-indigo-500"
                        />
                        <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl shrink-0 shadow-sm">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
