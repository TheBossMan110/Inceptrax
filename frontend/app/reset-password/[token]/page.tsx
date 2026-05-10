"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2, CheckCircle2, Eye, EyeOff, Check, X, ArrowLeft } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
]

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

  const strengthColor = passwordStrength.percent <= 25 ? "bg-red-500" :
    passwordStrength.percent <= 50 ? "bg-orange-500" :
    passwordStrength.percent <= 75 ? "bg-amber-500" : "bg-green-500"

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
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-3xl border shadow-sm text-center">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password reset!</h1>
            <p className="text-muted-foreground">Your password has been successfully updated. You can now log in with your new password.</p>
          </div>
          <Button
            className="w-full h-11 rounded-xl text-base font-semibold"
            onClick={() => router.push("/login")}
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl border shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Set new password</h1>
          <p className="text-muted-foreground">Your new password must be different from previously used passwords.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                required
                className="h-11 rounded-xl pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${passwordStrength.percent}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    strengthLabel === "Strong" ? "text-green-600" :
                    strengthLabel === "Good" ? "text-amber-600" :
                    strengthLabel === "Fair" ? "text-orange-600" : "text-red-600"
                  }`}>{strengthLabel}</span>
                </div>
                <ul className="space-y-1">
                  {PASSWORD_RULES.map(rule => (
                    <li key={rule.label} className="flex items-center gap-2 text-xs">
                      {rule.test(password)
                        ? <Check className="h-3 w-3 text-green-500" />
                        : <X className="h-3 w-3 text-muted-foreground" />}
                      <span className={rule.test(password) ? "text-green-600" : "text-muted-foreground"}>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              required
              className={`h-11 rounded-xl ${confirmPassword && password !== confirmPassword ? 'border-red-500' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords don&apos;t match</p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold" disabled={isLoading}>
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
