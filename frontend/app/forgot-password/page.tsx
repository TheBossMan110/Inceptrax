"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { Aurora, Reveal } from "@/components/fx"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

const INPUT_STYLES =
  "h-11 rounded-xl border-white/10 bg-white/[0.04] dark:border-white/10 dark:bg-white/[0.04] focus-visible:border-brand/60 focus-visible:ring-brand/25"
const INPUT_ERROR_STYLES =
  "border-danger/60 dark:border-danger/60 focus-visible:border-danger/60 focus-visible:ring-danger/25"

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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
        <Aurora />

        <Reveal y={20} className="w-full max-w-md">
          <div className="relative rounded-2xl border-gradient shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
            <div className="glass-strong rounded-2xl p-8 text-center">
              <Link
                href="/"
                className="mb-8 flex items-center justify-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <Logo size={36} src="/logo2.png" />
                <span className="text-xl font-semibold tracking-tight text-gradient-subtle">
                  Inceptrax
                </span>
              </Link>

              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-success/25 bg-success/10 text-success">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-gradient-subtle">
                Check your <span className="accent-serif text-gradient">email</span>
              </h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                If an account with <span className="font-medium text-foreground">{email}</span> exists,
                we&apos;ve sent password reset instructions to your inbox.
              </p>

              <div className="mt-8 space-y-3">
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07] press"
                  onClick={() => { setIsSent(false); setEmail("") }}
                >
                  Try a different email
                </Button>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-brand-cyan transition-colors hover:text-brand-cyan/80"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to login
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      <Aurora />

      <Reveal y={20} className="w-full max-w-md">
        <div className="relative rounded-2xl border-gradient shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
          <div className="glass-strong rounded-2xl p-8">
            <Link
              href="/"
              className="mb-8 flex items-center justify-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Logo size={36} src="/logo2.png" />
              <span className="text-xl font-semibold tracking-tight text-gradient-subtle">
                Inceptrax
              </span>
            </Link>

            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-brand/20 bg-gradient-to-br from-brand/25 to-brand-violet/15">
                <Mail className="h-5 w-5 text-brand-cyan" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-gradient-subtle">
                Forgot <span className="accent-serif text-gradient">password?</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No worries, we&apos;ll send you reset instructions.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className={`${INPUT_STYLES} ${error ? INPUT_ERROR_STYLES : ""}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError("") }}
                />
                {error && <p className="text-xs text-danger">{error}</p>}
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-primary text-base font-semibold hover:bg-primary/90 glow-primary shimmer press"
                disabled={isLoading}
              >
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

            <div className="divider-glow my-6" aria-hidden />

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back to login
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
