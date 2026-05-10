"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Bell, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface Notification {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [pollError, setPollError] = useState(false)
  const router = useRouter()
  const retryCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchNotifications = useCallback(async () => {
    if (retryCountRef.current >= 5) {
      setPollError(true)
      return
    }
    try {
      const res = await apiFetch("/notifications/")
      setNotifications(res.data?.notifications || [])
      setUnreadCount(res.data?.unread_count || 0)
      retryCountRef.current = 0 // reset on success
      setPollError(false)
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("Too many")) {
        retryCountRef.current += 1
        const backoffMs = [5000, 10000, 30000, 60000, 120000][retryCountRef.current - 1] || 120000
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setTimeout(() => {
          fetchNotifications()
          // Resume normal polling after successful backoff
          intervalRef.current = setInterval(fetchNotifications, 30000) as any
        }, backoffMs) as any
        return
      }
      // silent fail for other errors
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchNotifications])

  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/read", { method: "PUT" })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silent fail
    }
  }

  const handleClick = (notif: Notification) => {
    if (notif.link) {
      router.push(notif.link)
      setOpen(false)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={markAllRead}
            >
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 p-3 border-b last:border-0 transition-colors cursor-pointer hover:bg-muted/50",
                  !n.is_read && "bg-primary/5"
                )}
                onClick={() => handleClick(n)}
              >
                <div className={cn(
                  "h-2 w-2 rounded-full mt-1.5 shrink-0",
                  !n.is_read ? "bg-primary" : "bg-transparent"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {n.link && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
