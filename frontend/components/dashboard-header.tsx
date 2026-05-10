"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  LogOut,
  Settings,
  Sparkles,
  FileText,
  Plus,
  Search,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { NotificationBell } from "@/components/notification-bell"
import { apiFetch } from "@/lib/api"

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const msgRetryRef = useRef(0)

  const fetchUnreadMessages = useCallback(async () => {
    if (msgRetryRef.current >= 5) return
    try {
      const res = await apiFetch("/chat/unread-count")
      setUnreadMessages(res.unread_count || 0)
      msgRetryRef.current = 0
    } catch (err: any) {
      if (err?.message?.includes("429")) {
        msgRetryRef.current += 1
      }
    }
  }, [])

  useEffect(() => {
    fetchUnreadMessages()
    const interval = setInterval(fetchUnreadMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadMessages])
  const [open, setOpen] = useState(false)

  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "U"

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Command search trigger */}
        <div className="flex-grow max-w-md">
          <button
            onClick={() => setOpen(true)}
            className={[
              "group w-full h-9 rounded-lg border border-border",
              "bg-muted/40 px-3 text-sm text-muted-foreground",
              "flex items-center justify-between gap-3",
              "hover:bg-muted hover:border-border/80 hover:text-foreground",
              "transition-all duration-150 ease-in-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            ].join(" ")}
            aria-label="Open command palette"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm sm:inline hidden">Search or ask AI…</span>
              <span className="text-sm sm:hidden inline">Search…</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Messages shortcut */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => router.push("/dashboard/chat")}
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center px-1">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Button>

          <NotificationBell />

          {/* Avatar + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 ring-offset-background hover:ring-2 hover:ring-border transition-all duration-150"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} alt={initials} />
                  <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
              <DropdownMenuLabel className="pb-2">
                <p className="text-sm font-semibold leading-none">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {user?.email}
                </p>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => router.push("/dashboard/settings")}
                className="gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={logout}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/8"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command palette */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search ideas or ask AI…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { router.push("/dashboard/new-idea"); setOpen(false) }}>
              <Plus className="mr-2 h-4 w-4" />
              New Idea
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/dashboard/ideas"); setOpen(false) }}>
              <Sparkles className="mr-2 h-4 w-4" />
              My Ideas
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/dashboard/reports"); setOpen(false) }}>
              <FileText className="mr-2 h-4 w-4" />
              View Reports
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
