"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Send, MessageSquare, ArrowLeft, Search, Check, CheckCheck, Users,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

interface Conversation {
  partner_id: number
  partner_name: string
  partner_initial: string
  last_message: string
  last_message_time: string | null
  last_message_is_mine: boolean
  unread_count: number
}

interface ChatMessage {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  created_at: string
}

interface Partner {
  id: number
  name: string
  initial: string
}

const CHAT_PARTNER_KEY = "inceptrax_chat_partner"

export default function ChatPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const withUserId = searchParams.get("with")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activePartner, setActivePartner] = useState<Partner | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [isLoadingConvos, setIsLoadingConvos] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showConvoList, setShowConvoList] = useState(true)
  const [connectionLost, setConnectionLost] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const backoffTimerRef = useRef<NodeJS.Timeout | null>(null)

  const BACKOFF_DELAYS = [5000, 10000, 30000, 60000, 120000]
  const MAX_RETRIES = 5
  const POLL_INTERVAL = 15000

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Fetch conversations with exponential backoff on 429
  const fetchConversations = useCallback(async () => {
    if (retryCountRef.current >= MAX_RETRIES) {
      setConnectionLost(true)
      return
    }
    try {
      const res = await apiFetch("/chat/conversations")
      setConversations(res.conversations || [])
      retryCountRef.current = 0
      setConnectionLost(false)
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("Too many")) {
        retryCountRef.current += 1
        if (retryCountRef.current >= MAX_RETRIES) {
          setConnectionLost(true)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        } else {
          // Exponential backoff: pause polling, wait, then resume
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          const delay = BACKOFF_DELAYS[retryCountRef.current - 1] || 120000
          backoffTimerRef.current = setTimeout(() => {
            fetchConversations()
            pollIntervalRef.current = setInterval(() => {
              fetchConversations()
              if (activePartnerRef.current) fetchMessagesQuiet(activePartnerRef.current.id)
            }, POLL_INTERVAL) as any
          }, delay) as any
        }
      }
    } finally {
      setIsLoadingConvos(false)
    }
  }, [])

  // Fetch messages for a partner
  const fetchMessages = useCallback(async (partnerId: number) => {
    setIsLoadingMessages(true)
    try {
      const res = await apiFetch(`/chat/messages/${partnerId}`)
      setMessages(res.messages || [])
      setActivePartner(res.partner)
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error("Failed to load messages:", err)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [scrollToBottom])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Bug 4 Fix: Restore persisted partner on mount
  useEffect(() => {
    if (!isLoadingConvos && !activePartner && !withUserId) {
      const savedId = localStorage.getItem(CHAT_PARTNER_KEY)
      if (savedId) {
        const partnerId = parseInt(savedId, 10)
        if (!isNaN(partnerId)) {
          openConversation(partnerId)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingConvos])

  // Auto-open conversation if ?with= is set
  useEffect(() => {
    if (withUserId && !isLoadingConvos) {
      const partnerId = parseInt(withUserId, 10)
      if (!isNaN(partnerId)) {
        openConversation(partnerId)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId, isLoadingConvos])

  // Keep a ref to activePartner for use in backoff callbacks
  const activePartnerRef = useRef(activePartner)
  useEffect(() => { activePartnerRef.current = activePartner }, [activePartner])

  // Poll for new messages with backoff on 429
  useEffect(() => {
    if (activePartner) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessagesQuiet(activePartner.id)
        fetchConversations()
      }, POLL_INTERVAL)
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (backoffTimerRef.current) clearTimeout(backoffTimerRef.current)
    }
  }, [activePartner, fetchConversations])

  // Re-fetch on window focus (ensures data isn't stale)
  useEffect(() => {
    const handleFocus = () => {
      fetchConversations()
      if (activePartner) fetchMessagesQuiet(activePartner.id)
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [activePartner, fetchConversations])

  // Quiet fetch (no loading state) for polling
  const fetchMessagesQuiet = async (partnerId: number) => {
    try {
      const res = await apiFetch(`/chat/messages/${partnerId}`)
      setMessages(res.messages || [])
    } catch {
      // silent
    }
  }

  const openConversation = async (partnerId: number) => {
    setShowConvoList(false)
    // Bug 4 Fix: Persist selected partner
    localStorage.setItem(CHAT_PARTNER_KEY, String(partnerId))
    await fetchMessages(partnerId)
    fetchConversations()
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !activePartner || isSending) return

    const content = newMessage.trim()
    setNewMessage("")
    setIsSending(true)

    // Optimistic UI: add message immediately
    const optimisticMsg: ChatMessage = {
      id: Date.now(),
      sender_id: user?.id || 0,
      receiver_id: activePartner.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(scrollToBottom, 50)

    try {
      const res = await apiFetch(`/chat/messages/${activePartner.id}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      })
      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? res.message : m))
      )
      fetchConversations()
    } catch (err) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      console.error("Failed to send message:", err)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return d.toLocaleDateString(undefined, { weekday: "short" })
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  // Group messages by date for WhatsApp-style date dividers
  const getDateLabel = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
  }

  const filteredConvos = searchQuery
    ? conversations.filter((c) =>
        c.partner_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  // Compute date groups for messages
  const messageDateGroups: { date: string; messages: ChatMessage[] }[] = []
  messages.forEach((msg) => {
    const dateKey = new Date(msg.created_at).toDateString()
    const last = messageDateGroups[messageDateGroups.length - 1]
    if (last && last.date === dateKey) {
      last.messages.push(msg)
    } else {
      messageDateGroups.push({ date: dateKey, messages: [msg] })
    }
  })

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-6xl mx-auto overflow-hidden rounded-xl border bg-card">
      {/* ─── Left Panel: Conversation List ─────────────────── */}
      <div
        className={cn(
          "w-80 border-r flex flex-col shrink-0 bg-background",
          !showConvoList && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Messages</h2>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations…"
              className="pl-9 h-9 text-sm rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConvos ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs text-muted-foreground">
                Message founders from the Explore page to start chatting
              </p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filteredConvos.map((convo) => {
                const isActive = activePartner?.id === convo.partner_id
                return (
                  <button
                    key={convo.partner_id}
                    onClick={() => openConversation(convo.partner_id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                      isActive
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/60"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background"
                    )}>
                      {convo.partner_initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-sm truncate",
                          convo.unread_count > 0 ? "font-bold" : "font-medium"
                        )}>
                          {convo.partner_name}
                        </span>
                        {convo.last_message_time && (
                          <span className={cn(
                            "text-[10px] shrink-0 ml-2",
                            convo.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground"
                          )}>
                            {formatTime(convo.last_message_time)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={cn(
                          "text-xs truncate pr-2",
                          convo.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {convo.last_message_is_mine && (
                            <span className="text-muted-foreground/60">You: </span>
                          )}
                          {convo.last_message || "Start a conversation"}
                        </p>
                        {convo.unread_count > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Panel: Messages ──────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          showConvoList && !activePartner && "hidden md:flex"
        )}
      >
        {activePartner ? (
          <>
            {/* Chat header */}
            <div className="h-16 border-b flex items-center gap-3 px-4 shrink-0 bg-background/80 backdrop-blur-sm">
              <button
                onClick={() => {
                  setShowConvoList(true)
                  setActivePartner(null)
                }}
                className="md:hidden p-1.5 hover:bg-muted rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {activePartner.initial}
              </div>
              <div>
                <p className="text-sm font-bold leading-none">
                  {activePartner.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Online</p>
              </div>
            </div>

            {/* Messages area */}
            {/* Connection lost banner */}
            {connectionLost && (
              <div className="mx-4 mt-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-center">
                <p className="text-xs font-medium text-muted-foreground">Connection lost. <button onClick={() => { retryCountRef.current = 0; setConnectionLost(false); fetchConversations(); }} className="text-foreground underline font-semibold">Retry</button></p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--muted)/0.3) 0%, transparent 100%)" }}>
              {isLoadingMessages ? (
                <div className="space-y-3 pt-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
                    >
                      <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-36")} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Start the conversation</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Say hello to {activePartner.name}! 👋
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messageDateGroups.map((group) => (
                    <div key={group.date}>
                      {/* Date divider */}
                      <div className="flex items-center justify-center my-4">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/80 px-3 py-1 rounded-full">
                          {getDateLabel(group.messages[0].created_at)}
                        </span>
                      </div>
                      {/* Messages */}
                      <div className="space-y-1.5">
                        {group.messages.map((msg) => {
                          const isMine = msg.sender_id === (user?.id || 0)
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex",
                                isMine ? "justify-end" : "justify-start"
                              )}
                            >
                              {/* Avatar for received messages */}
                              {!isMine && (
                                <div className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold text-foreground/60 shrink-0 mr-2 mt-1">
                                  {activePartner.initial}
                                </div>
                              )}
                              <div
                                className={cn(
                                  "max-w-[70%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                                  isMine
                                    ? "bg-foreground text-background rounded-2xl rounded-br-md"
                                    : "bg-card border border-border rounded-2xl rounded-bl-md"
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                <div
                                  className={cn(
                                    "flex items-center gap-1 mt-1",
                                    isMine ? "justify-end" : "justify-start"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "text-[10px]",
                                      isMine ? "text-background/50" : "text-muted-foreground"
                                    )}
                                  >
                                    {new Date(msg.created_at).toLocaleTimeString(undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {isMine && (
                                    msg.is_read ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                                    ) : (
                                      <Check className="h-3 w-3 text-background/50" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            {/* end messages area wrapper */}

            {/* Input area */}
            <div className="border-t p-3 shrink-0 bg-background">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 h-11 rounded-full px-5 border-2 focus:border-primary transition-colors"
                  maxLength={2000}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || isSending}
                  className="h-11 w-11 rounded-full shrink-0 shadow-md"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Your Messages</h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                Select a conversation to start messaging, or find founders on the Explore page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
