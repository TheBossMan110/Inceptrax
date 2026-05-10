"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      setIsSent(true)
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setIsSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-3xl border shadow-sm text-center">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-muted-foreground max-w-xs">
              If an account with <span className="font-medium text-foreground">{email}</span> exists, 
              we&apos;ve sent password reset instructions to your inbox.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={() => { setIsSent(false); setEmail("") }}
            >
              Try a different email
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline w-full"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Forgot password?</h1>
          <p className="text-muted-foreground">No worries, we&apos;ll send you reset instructions.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              required
              className={`h-11 rounded-xl ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
