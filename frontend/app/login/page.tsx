"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { Aurora, Reveal } from "@/components/fx"
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

const INPUT_STYLES =
  "h-11 rounded-xl border-white/10 bg-white/[0.04] dark:border-white/10 dark:bg-white/[0.04] focus-visible:border-brand/60 focus-visible:ring-brand/25"
const INPUT_ERROR_STYLES =
  "border-danger/60 dark:border-danger/60 focus-visible:border-danger/60 focus-visible:ring-danger/25"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  // Inline validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }
    switch (field) {
      case "email":
        if (!value.trim()) newErrors.email = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = "Enter a valid email"
        else delete newErrors.email
        break
      case "password":
        if (!value) newErrors.password = "Password is required"
        else delete newErrors.password
        break
    }
    setErrors(newErrors)
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    validateField("email", email)
    validateField("password", password)
    setTouched({ email: true, password: true })

    if (!email.trim() || !password) return

    setIsLoading(true)

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      login(data.user, data.token, data.refresh_token)
      toast.success("Login successful!")
    } catch (error: any) {
      // Never clear form on error
      toast.error(error.message || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      <Aurora />

      <Link
        href="/"
        className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to home
      </Link>

      <Reveal y={20} className="w-full max-w-md">
        <div className="relative rounded-2xl border-gradient shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
          <div className="glass-strong rounded-2xl p-8">
            {/* Logo + wordmark */}
            <Link
              href="/"
              className="mb-8 flex items-center justify-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Logo size={36} src="/logo2.png" />
              <span className="text-xl font-semibold tracking-tight text-gradient-subtle">
                Inceptrax
              </span>
            </Link>

            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-gradient-subtle">
                Welcome <span className="accent-serif text-gradient">back</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your credentials to access your dashboard
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className={`${INPUT_STYLES} ${touched.email && errors.email ? INPUT_ERROR_STYLES : ""}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (touched.email) validateField("email", e.target.value) }}
                  onBlur={() => validateField("email", email)}
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-danger">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-brand-cyan transition-colors hover:text-brand-cyan/80"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className={`${INPUT_STYLES} pr-10 ${touched.password && errors.password ? INPUT_ERROR_STYLES : ""}`}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (touched.password) validateField("password", e.target.value) }}
                    onBlur={() => validateField("password", password)}
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
                {touched.password && errors.password && (
                  <p className="text-xs text-danger">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-xl bg-primary text-base font-semibold hover:bg-primary/90 glow-primary shimmer press"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground/70">
              By continuing, you agree to our{" "}
              <Link href="/terms-of-service" className="underline underline-offset-4 transition-colors hover:text-foreground">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy-policy" className="underline underline-offset-4 transition-colors hover:text-foreground">Privacy Policy</Link>.
            </p>

            <div className="divider-glow my-6" aria-hidden />

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-brand-cyan transition-colors hover:text-brand-cyan/80">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
