"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Calendar, Zap, ShieldCheck } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  is_admin: boolean
  api_credits_used: number
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await apiFetch("/admin/users")
        setUsers(response.users)
      } catch (error) {
        console.error("Failed to fetch users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2.5">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-4 w-72 max-w-full" />
        </div>
        <div className="card-premium rounded-2xl p-6 space-y-4">
          <div className="skeleton h-5 w-40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-up">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor user activity and credit usage.</p>
      </div>

      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">Registered Users</h3>
          <span className="rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-0.5 text-xs font-mono tabular-nums text-muted-foreground">
            {users.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-white/[0.06]">
                <TableHead className="w-[250px] pl-6 text-xs font-mono uppercase tracking-wider text-muted-foreground/70">
                  User
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground/70">
                  Email
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground/70">
                  Role
                </TableHead>
                <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground/70">
                  API Usage
                </TableHead>
                <TableHead className="text-right pr-6 text-xs font-mono uppercase tracking-wider text-muted-foreground/70">
                  Joined Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >
                  <TableCell className="pl-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-brand to-brand-violet text-white text-xs font-semibold">
                          {`${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand/12 text-brand-cyan border border-brand/25 px-2.5 py-0.5 text-xs font-semibold">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-white/[0.04] text-muted-foreground border border-white/10 px-2.5 py-0.5 text-xs font-medium">
                        User
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-warning shrink-0" />
                      <span className="font-semibold tabular-nums">{user.api_credits_used}</span>
                      <span className="text-xs text-muted-foreground font-normal">credits used</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 text-muted-foreground">
                    <div className="flex items-center justify-end gap-2 tabular-nums">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
