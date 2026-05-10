"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, Calendar, Zap } from "lucide-react"
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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="text-muted-foreground">Monitor user activity and credit usage.</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="w-[250px] pl-6">User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>API Usage</TableHead>
                <TableHead className="text-right pr-6">Joined Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium pl-6">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Badge variant="default" className="bg-primary/20 text-primary border-none">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-muted">
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">{user.api_credits_used}</span>
                      <span className="text-xs text-muted-foreground font-normal">credits used</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 text-muted-foreground">
                    <div className="flex items-center justify-end gap-2">
                       <Calendar className="h-4 w-4" />
                       {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
