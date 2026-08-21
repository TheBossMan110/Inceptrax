"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { Aurora, Reveal } from "@/components/fx"
import { Lock, Loader2, CheckCircle2, Eye, EyeOff, Check, X, ArrowLeft, ArrowRight } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
]

const INPUT_STYLES =
  "h-11 rounded-xl border-white/10 bg-white/[0.04] dark:border-white/10 dark:bg-white/[0.04] focus-visible:border-brand/60 focus-visible:ring-brand/25"
const INPUT_ERROR_STYLES =
  "border-danger/60 dark:border-danger/60 focus-visible:border-danger/60 focus-visible:ring-danger/25"

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const passwordStrength = useMemo(() => {
    const passed = PASSWORD_RULES.filter(r => r.test(password)).length
    return { passed, total: PASSWORD_RULES.length, percent: (passed / PASSWORD_RULES.length) * 100 }
  }, [password])

  const strengthColor = passwordStrength.percent <= 25 ? "bg-danger" :
    passwordStrength.percent <= 50 ? "bg-warning" :
    passwordStrength.percent <= 75 ? "bg-brand-cyan" : "bg-success"

  const strengthLabel = passwordStrength.percent <= 25 ? "Weak" :
    passwordStrength.percent <= 50 ? "Fair" :
    passwordStrength.percent <= 75 ? "Good" : "Strong"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (passwordStrength.passed < PASSWORD_RULES.length) {
      setError("Password doesn't meet all requirements")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setIsLoading(true)

    try {
      await apiFetch(`/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      })
      setIsSuccess(true)
      toast.success("Password reset successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
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
                Password <span className="accent-serif text-gradient">reset!</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Your password has been successfully updated. You can now log in with your new password.
              </p>

              <Button
                className="mt-8 h-11 w-full gap-2 rounded-xl bg-primary text-base font-semibold hover:bg-primary/90 glow-primary shimmer press"
                onClick={() => router.push("/login")}
              >
                Go to Login <ArrowRight className="h-4 w-4" />
              </Button>
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
                <Lock className="h-5 w-5 text-brand-cyan" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-gradient-subtle">
                Set a <span className="accent-serif text-gradient">new</span> password
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your new password must be different from previously used passwords.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    required
                    className={`${INPUT_STYLES} pr-10`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className={`pw-strength-bar ${strengthColor}`}
                          style={{ width: `${passwordStrength.percent}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        strengthLabel === "Strong" ? "text-success" :
                        strengthLabel === "Good" ? "text-brand-cyan" :
                        strengthLabel === "Fair" ? "text-warning" : "text-danger"
                      }`}>{strengthLabel}</span>
                    </div>
                    <ul className="space-y-1">
                      {PASSWORD_RULES.map(rule => (
                        <li key={rule.label} className="flex items-center gap-2 text-xs">
                          {rule.test(password)
                            ? <Check className="h-3 w-3 text-success" />
                            : <X className="h-3 w-3 text-muted-foreground/50" />}
                          <span className={rule.test(password) ? "text-foreground/75" : "text-muted-foreground/60"}>
                            {rule.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  required
                  className={`${INPUT_STYLES} ${confirmPassword && password !== confirmPassword ? INPUT_ERROR_STYLES : ""}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-danger">Passwords don&apos;t match</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-primary text-base font-semibold hover:bg-primary/90 glow-primary shimmer press"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
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
