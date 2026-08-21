"use client"

import { useState, useEffect } from "react";
import { Send, Sparkles, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface CoFounderChatProps {
    ideaId: number;
    section: string;
    sectionName: string;
    onUpdate: (newData: any) => void;
    trigger?: React.ReactNode;
    isOpenExternal?: boolean;
    setIsOpenExternal?: (open: boolean) => void;
    initialContext?: string;
    mode?: "edit" | "preview";
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

export function CoFounderChat({
    ideaId,
    section,
    sectionName,
    onUpdate,
    trigger,
    isOpenExternal,
    setIsOpenExternal,
    initialContext,
    mode = "edit"
}: CoFounderChatProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalIsOpen;
    const setIsOpen = setIsOpenExternal || setInternalIsOpen;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialContext) {
                setMessages([
                    {
                        role: "assistant",
                        content: `I see you want to refine this part: "${initialContext.substring(0, 50)}${initialContext.length > 50 ? "..." : ""}". How should we change it?`,
                    }
                ]);
            } else if (messages.length === 0) {
                setMessages([
                    {
                        role: "assistant",
                        content: `Hello! I'm your AI Co-Founder. How can I help you refine the **${sectionName}** section today?`,
                    }
                ]);
            }
        }
    }, [isOpen, initialContext, sectionName]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        let queryPayload = userMsg;
        if (initialContext) {
            queryPayload = `Context: "${initialContext}"\n\nUser Request: ${userMsg}`;
        }

        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await apiFetch<{
                data: {
                    section: string;
                    updated_data: any;
                    message: string;
                };
                message: string;
            }>(`/ideas/${ideaId}/refine`, {
                method: "POST",
                body: JSON.stringify({
                    section,
                    query: queryPayload,
                    save: mode !== "preview" // Only save if not in preview mode
                }),
            });

            if (response.data) {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: response.message || "I've updated the plan." },
                ]);

                onUpdate(response.data.updated_data);
                if (mode !== "preview") {
                    toast.success(`${sectionName} updated successfully!`);
                } else {
                    toast.info(`Preview generated for ${sectionName}. Please review.`);
                }
            }
        } catch (error) {
            console.error("Refinement error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error while updating the plan. Please try again.",
                },
            ]);
            toast.error("Failed to update plan");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            {isOpenExternal === undefined && (
                <SheetTrigger asChild>
                    {trigger || (
                        <Button variant="outline" size="sm" className="gap-2">
                            <Sparkles className="h-5 w-5" />
                            Ask Co-Founder
                        </Button>
                    )}
                </SheetTrigger>
            )}
            <SheetContent className="flex flex-col w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        AI Co-Founder: {sectionName}
                    </SheetTitle>
                    <SheetDescription>
                        Chat with me to refine this section. I will update the report in real-time.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`flex items-start gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                                    >
                                        <div
                                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user"
                                                ? "bg-gradient-to-br from-brand to-brand-violet text-white"
                                                : "bg-white/[0.06] text-brand-cyan border border-white/[0.08]"
                                                }`}
                                        >
                                            {msg.role === "user" ? (
                                                <User className="h-4 w-4" />
                                            ) : (
                                                <Bot className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div
                                            className={`p-3 rounded-xl text-sm ${msg.role === "user"
                                                ? "bg-brand/90 text-white shadow-[0_4px_16px_-4px_oklch(0.585_0.222_277/0.4)]"
                                                : "bg-white/[0.05] text-foreground/90 border border-white/[0.06]"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 justify-start">
                                    <div className="flex items-start gap-2 max-w-[80%]">
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-white/[0.06] text-brand-cyan border border-white/[0.08]">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                        <div className="bg-white/[0.05] border border-white/[0.06] p-3 rounded-xl flex items-center gap-2 text-muted-foreground text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Thinking...
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="flex gap-2 pt-2">
                        <Input
                            placeholder={initialContext ? "Review selected text..." : `Ask to change ${sectionName}...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                            disabled={isLoading}
                            autoFocus
                        />
                        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
