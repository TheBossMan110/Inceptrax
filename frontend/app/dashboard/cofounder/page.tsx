"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MapPin, MessageSquare, Briefcase, User as UserIcon, Link as LinkIcon, MessageCircle, Users } from "lucide-react"
import { FounderChatPanel } from "@/components/founder-chat-panel"
import { formatDistanceToNow } from "date-fns"

interface FounderProfile {
  id: number
  first_name: string
  last_name: string
  bio: string
  skills: string
  looking_for: string
  linkedin_url: string
  joined: string
}

interface Conversation {
  user: {
    id: number
    first_name: string
    last_name: string
  }
  last_message: {
    content: string
    created_at: string
    sender_id: number
  }
  unread_count: number
}

export default function CoFounderNetworkPage() {
  const [profiles, setProfiles] = useState<FounderProfile[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(true)

  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // Chat Panel State
  const [chatOpen, setChatOpen] = useState(false)
  const [activeRecipientId, setActiveRecipientId] = useState<number | null>(null)
  const [activeRecipientName, setActiveRecipientName] = useState("")

  useEffect(() => {
    // Get current user id
    apiFetch("/users/profile").then(res => {
        setCurrentUserId(res.data.user.id)
    }).catch(console.error)

    fetchProfiles()
    fetchConversations()

    // Poll conversations every 10 seconds to catch new incoming messages if the chat panel is closed
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchProfiles = async (query = "") => {
    setLoadingProfiles(true)
    try {
      const url = query ? `/cofounder/profiles?skills=${encodeURIComponent(query)}` : `/cofounder/profiles`
      const res = await apiFetch(url)
      setProfiles(res.data.profiles)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProfiles(false)
    }
  }

  const fetchConversations = async () => {
    try {
        const res = await apiFetch('/cofounder/conversations')
        setConversations(res.data.conversations)
    } catch (err) {
        console.error(err)
    } finally {
        setLoadingConversations(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProfiles(searchQuery)
  }

  // Also refetch conversations when chat is closed, in case read status changed
  const handleChatClose = (isOpen: boolean) => {
    setChatOpen(isOpen)
    if (!isOpen) { // Just closed
        fetchConversations()
    }
  }

  const openChat = (userId: number, firstName: string, lastName: string) => {
    setActiveRecipientId(userId)
    setActiveRecipientName(`${firstName} ${lastName}`)
    setChatOpen(true)
  }

  const totalUnreadCount = conversations.reduce((acc, curr) => acc + curr.unread_count, 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Co-Founder Network</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover and connect with like-minded founders building the future.
        </p>
      </div>

      <Tabs defaultValue="discover" className="w-full mt-4">
        <TabsList className="mb-4 rounded-xl bg-white/[0.04] border border-white/[0.08] p-1">
            <TabsTrigger value="discover" className="gap-2 rounded-lg">
                <Search className="h-4 w-4" /> Discover
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-2 relative rounded-lg">
                <MessageCircle className="h-4 w-4" /> Conversations
                {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white shadow-[0_0_10px_oklch(0.585_0.222_277/0.6)] ring-1 ring-background">
                        {totalUnreadCount}
                    </span>
                )}
            </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by skills (e.g. React, Python)"
                    className="pl-9 rounded-xl bg-white/[0.03] border-white/[0.08] focus-visible:border-brand/40"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                </div>
                <Button type="submit" variant="outline" className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press">Filter</Button>
            </form>

            {/* Profiles Grid */}
            {loadingProfiles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="card-premium rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="skeleton h-12 w-12 rounded-full" />
                                <div className="space-y-2">
                                    <div className="skeleton h-4 w-32" />
                                    <div className="skeleton h-3 w-20" />
                                </div>
                            </div>
                            <div className="skeleton h-3 w-full" />
                            <div className="skeleton h-3 w-4/5" />
                            <div className="flex gap-1.5">
                                <div className="skeleton h-5 w-16 rounded-full" />
                                <div className="skeleton h-5 w-20 rounded-full" />
                            </div>
                            <div className="skeleton h-10 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : profiles.length === 0 ? (
                <div className="card-premium rounded-2xl text-center py-16 px-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mx-auto">
                        <Users className="h-5 w-5 text-brand-cyan" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold tracking-tight">No founders found</h3>
                        <p className="text-sm text-muted-foreground">Try adjusting your skill filters or check back later.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((founder) => (
                    <Card key={founder.id} className="card-premium card-premium-hover rounded-2xl border-none shadow-none flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-white/[0.06] pb-4">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3 items-center">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand to-brand-violet text-white flex items-center justify-center font-bold text-lg">
                                    {founder.first_name[0]}{founder.last_name[0]}
                                </div>
                                <div>
                                    <CardTitle className="text-lg tracking-tight">{founder.first_name} {founder.last_name}</CardTitle>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> Remote
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-4 space-y-4">
                        <div>
                        <h4 className="text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5" /> Bio
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {founder.bio || "No bio provided."}
                        </p>
                        </div>

                        <div>
                        <h4 className="text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground/70 mb-2 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" /> Skills
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {founder.skills ? (
                                founder.skills.split(',').map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="font-normal rounded-full bg-brand/10 text-brand-cyan border border-brand/20 hover:bg-brand/15">
                                    {skill.trim()}
                                </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground/60">None specified</span>
                            )}
                        </div>
                        </div>

                        <div>
                        <h4 className="text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground/70 mb-1.5">Looking for</h4>
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                            {founder.looking_for || "Open to chat"}
                        </p>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-white/[0.06] gap-2">
                        <Button
                            className="flex-1 w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 press"
                            onClick={() => openChat(founder.id, founder.first_name, founder.last_name)}
                        >
                        <MessageSquare className="h-4 w-4" /> Message
                        </Button>
                        {founder.linkedin_url && (
                            <Button variant="outline" size="icon" className="rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press" asChild>
                                <a href={founder.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn Profile">
                                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                </a>
                            </Button>
                        )}
                    </CardFooter>
                    </Card>
                ))}
                </div>
            )}
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4 pt-2">
            <Card className="card-premium rounded-2xl border-none shadow-none overflow-hidden">
                <CardHeader className="border-b border-white/[0.06] pb-4">
                     <CardTitle className="text-lg tracking-tight">Your Conversations</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingConversations ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4 p-3">
                                    <div className="skeleton h-12 w-12 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton h-4 w-36" />
                                        <div className="skeleton h-3 w-48" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="py-16 px-6 text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-4">
                                <MessageSquare className="h-5 w-5 text-brand-cyan" />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">No conversations yet</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Head to the Discover tab to find fellow founders and start chatting.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.05]">
                            {conversations.map((convo) => {
                                const dateObj = new Date(convo.last_message.created_at)
                                const timeStr = isNaN(dateObj.getTime()) ? "" : formatDistanceToNow(dateObj, { addSuffix: true })

                                return (
                                <div
                                    key={convo.user.id}
                                    className="flex items-center gap-4 p-4 hover:bg-white/[0.04] cursor-pointer transition-colors"
                                    onClick={() => openChat(convo.user.id, convo.user.first_name, convo.user.last_name)}
                                >
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand to-brand-violet text-white flex flex-shrink-0 items-center justify-center font-bold text-lg relative">
                                        {convo.user.first_name[0]}{convo.user.last_name[0]}
                                        {convo.unread_count > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-[0_0_10px_oklch(0.585_0.222_277/0.6)] ring-2 ring-background">
                                                {convo.unread_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className={`text-base truncate ${convo.unread_count > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'}`}>
                                                {convo.user.first_name} {convo.user.last_name}
                                            </h4>
                                            <span className="text-xs font-mono text-muted-foreground/70 whitespace-nowrap ml-2">
                                                {timeStr}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${convo.unread_count > 0 ? 'font-medium text-foreground/90' : 'text-muted-foreground'}`}>
                                            {convo.last_message.sender_id === currentUserId ? "You: " : ""}
                                            {convo.last_message.content}
                                        </p>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Chat Component */}
      <FounderChatPanel 
        isOpen={chatOpen} 
        setIsOpen={handleChatClose} 
        recipientId={activeRecipientId} 
        recipientName={activeRecipientName} 
        currentUserId={currentUserId}
      />
    </div>
  )
}
