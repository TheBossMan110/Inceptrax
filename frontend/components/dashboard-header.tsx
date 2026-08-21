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
      <header className="relative h-16 shrink-0 bg-background/60 backdrop-blur-xl backdrop-saturate-150 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Gradient hairline base */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent"
        />

        {/* Command search trigger */}
        <div className="flex-grow max-w-md">
          <button
            onClick={() => setOpen(true)}
            className={[
              "group w-full h-9 rounded-xl border border-white/[0.07]",
              "bg-white/[0.035] px-3 text-sm text-muted-foreground/80",
              "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)]",
              "flex items-center justify-between gap-3",
              "hover:bg-white/[0.06] hover:border-brand/25 hover:text-foreground",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            ].join(" ")}
            aria-label="Open command palette"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 group-hover:text-brand-cyan transition-colors duration-200" />
              <span className="text-[13px] truncate sm:inline hidden">Search or ask AI…</span>
              <span className="text-[13px] sm:hidden inline">Search…</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70 shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 ml-4">
          {/* Messages shortcut */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors duration-200"
            onClick={() => router.push("/dashboard/chat")}
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-brand text-white text-[10px] font-bold tabular-nums flex items-center justify-center px-1 shadow-[0_0_10px_oklch(0.585_0.222_277/0.6)]">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Button>

          <NotificationBell />

          {/* Divider */}
          <span aria-hidden className="hidden sm:block h-5 w-px bg-white/[0.08] mx-1.5" />

          {/* Avatar + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 hover:bg-transparent ring-offset-background ring-1 ring-white/[0.08] hover:ring-2 hover:ring-brand/50 transition-all duration-200"
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} alt={initials} />
                  <AvatarFallback className="bg-gradient-to-br from-brand to-brand-violet text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-60 rounded-xl glass-strong p-1.5"
              align="end"
              sideOffset={10}
            >
              <DropdownMenuLabel className="px-2 py-2.5 flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user?.avatar_url} alt={initials} />
                  <AvatarFallback className="bg-gradient-to-br from-brand to-brand-violet text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground mt-1.5 truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-white/[0.07]" />

              <DropdownMenuItem
                onSelect={() => router.push("/dashboard/settings")}
                className="gap-2.5 cursor-pointer rounded-lg py-2 text-[13px]"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/[0.07]" />

              <DropdownMenuItem
                onClick={logout}
                className="gap-2.5 cursor-pointer rounded-lg py-2 text-[13px] text-destructive focus:text-destructive focus:bg-destructive/8"
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
            <CommandItem
              className="rounded-lg py-2.5"
              onSelect={() => { router.push("/dashboard/new-idea"); setOpen(false) }}
            >
              <Plus className="mr-2.5 h-4 w-4 text-brand-cyan" />
              New Idea
            </CommandItem>
            <CommandItem
              className="rounded-lg py-2.5"
              onSelect={() => { router.push("/dashboard/ideas"); setOpen(false) }}
            >
              <Sparkles className="mr-2.5 h-4 w-4 text-brand-cyan" />
              My Ideas
            </CommandItem>
            <CommandItem
              className="rounded-lg py-2.5"
              onSelect={() => { router.push("/dashboard/reports"); setOpen(false) }}
            >
              <FileText className="mr-2.5 h-4 w-4 text-brand-cyan" />
              View Reports
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
