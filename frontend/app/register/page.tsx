"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { Aurora, Reveal } from "@/components/fx"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

// Password strength rules
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
]

const VALUE_PROPS = [
  { icon: Sparkles, label: "Unlimited idea validation analysis" },
  { icon: BarChart3, label: "Deep-dive market research reports" },
  { icon: Target, label: "Competitor intelligence tracking" },
  { icon: Users, label: "AI-generated user personas" },
  { icon: Zap, label: "Step-by-step MVP blueprints" },
]

const INPUT_STYLES =
  "h-11 rounded-xl border-white/10 bg-white/[0.04] dark:border-white/10 dark:bg-white/[0.04] focus-visible:border-brand/60 focus-visible:ring-brand/25"
const INPUT_ERROR_STYLES =
  "border-danger/60 dark:border-danger/60 focus-visible:border-danger/60 focus-visible:ring-danger/25"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  // Inline validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Password strength calculation
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

  // Validate field on blur
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    switch (field) {
      case "firstName":
        if (!value.trim()) newErrors.firstName = "First name is required"
        else delete newErrors.firstName
        break
      case "lastName":
        if (!value.trim()) newErrors.lastName = "Last name is required"
        else delete newErrors.lastName
        break
      case "email":
        if (!value.trim()) newErrors.email = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.email = "Enter a valid email"
        else delete newErrors.email
        break
      case "password":
        if (passwordStrength.passed < PASSWORD_RULES.length) newErrors.password = "Password doesn't meet all requirements"
        else delete newErrors.password
        // Revalidate confirm password
        if (confirmPassword && value !== confirmPassword) newErrors.confirmPassword = "Passwords don't match"
        else delete newErrors.confirmPassword
        break
      case "confirmPassword":
        if (value !== password) newErrors.confirmPassword = "Passwords don't match"
        else delete newErrors.confirmPassword
        break
    }

    setErrors(newErrors)
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields before submit
    validateField("firstName", firstName)
    validateField("lastName", lastName)
    validateField("email", email)
    validateField("password", password)
    validateField("confirmPassword", confirmPassword)

    setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true })

    // Check for remaining errors
    if (!firstName.trim() || !lastName.trim() || !email.trim() ||
        passwordStrength.passed < PASSWORD_RULES.length || password !== confirmPassword) {
      toast.error("Please fix the errors before submitting")
      return
    }

    setIsLoading(true)

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password
        }),
      })

      // Auto-login after successful registration
      login(data.user, data.token, data.refresh_token)
      toast.success("Account created successfully!")
    } catch (error: any) {
      // NEVER clear form on error — spec requirement
      toast.error(error.message || "Failed to register")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <Aurora />

      {/* Left Side: Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-white/[0.06] p-12 xl:p-16 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Logo size={40} src="/logo2.png" />
          <span className="text-xl font-semibold tracking-tight text-gradient-subtle">
            Inceptrax
          </span>
        </Link>

        <Reveal y={16} className="max-w-md">
          <p className="eyebrow mb-4">Why founders join</p>
          <h2 className="mb-10 text-gradient-subtle">
            Start building with <span className="accent-serif text-gradient">data</span>, not guesses.
          </h2>

          <ul className="space-y-4">
            {VALUE_PROPS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-gradient-to-br from-brand/25 to-brand-violet/15">
                  <Icon className="h-4.5 w-4.5 text-brand-cyan" />
                </div>
                <span className="text-[15px] text-foreground/85">{label}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <p className="text-xs text-muted-foreground/60">2026 Inceptrax Inc. All rights reserved.</p>
      </div>

      {/* Right Side: Register Form */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-16 lg:w-1/2">
        <Link
          href="/"
          className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <Reveal y={20} className="w-full max-w-md">
          <div className="relative rounded-2xl border-gradient shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
            <div className="glass-strong rounded-2xl p-8">
              {/* Logo + wordmark (mobile only — brand panel owns it on lg+) */}
              <Link
                href="/"
                className="mb-8 flex items-center justify-center gap-2.5 transition-opacity hover:opacity-80 lg:hidden"
              >
                <Logo size={36} src="/logo2.png" />
                <span className="text-xl font-semibold tracking-tight text-gradient-subtle">
                  Inceptrax
                </span>
              </Link>

              <div className="mb-7 text-center lg:text-left">
                <h1 className="text-3xl font-semibold tracking-tight text-gradient-subtle">
                  Create your <span className="accent-serif text-gradient">account</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">Start validating your ideas for free.</p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="text-xs font-medium text-muted-foreground">
                      First name
                    </Label>
                    <Input
                      id="first-name"
                      placeholder="Jane"
                      required
                      className={`${INPUT_STYLES} ${touched.firstName && errors.firstName ? INPUT_ERROR_STYLES : ""}`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => validateField("firstName", firstName)}
                    />
                    {touched.firstName && errors.firstName && (
                      <p className="text-xs text-danger">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name" className="text-xs font-medium text-muted-foreground">
                      Last name
                    </Label>
                    <Input
                      id="last-name"
                      placeholder="Doe"
                      required
                      className={`${INPUT_STYLES} ${touched.lastName && errors.lastName ? INPUT_ERROR_STYLES : ""}`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => validateField("lastName", lastName)}
                    />
                    {touched.lastName && errors.lastName && (
                      <p className="text-xs text-danger">{errors.lastName}</p>
                    )}
                  </div>
                </div>

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
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => validateField("email", email)}
                  />
                  {touched.email && errors.email && (
                    <p className="text-xs text-danger">{errors.email}</p>
                  )}
                </div>

                {/* Password with strength meter */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
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

                  {/* Password strength bar */}
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

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    required
                    className={`${INPUT_STYLES} ${touched.confirmPassword && errors.confirmPassword ? INPUT_ERROR_STYLES : ""}`}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (touched.confirmPassword) validateField("confirmPassword", e.target.value) }}
                    onBlur={() => validateField("confirmPassword", confirmPassword)}
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-xs text-danger">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="mt-2 h-11 w-full gap-2 rounded-xl bg-primary text-base font-semibold hover:bg-primary/90 glow-primary shimmer press"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 px-4 text-center text-xs leading-relaxed text-muted-foreground/70">
                By clicking &ldquo;Create Account&rdquo;, you agree to our{" "}
                <Link href="/terms-of-service" className="underline underline-offset-4 transition-colors hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className="underline underline-offset-4 transition-colors hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>

              <div className="divider-glow my-6" aria-hidden />

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-brand-cyan transition-colors hover:text-brand-cyan/80">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
