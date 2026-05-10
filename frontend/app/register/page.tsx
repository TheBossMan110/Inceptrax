"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { ArrowLeft, Check, Loader2, Eye, EyeOff, X } from "lucide-react"
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

  const strengthColor = passwordStrength.percent <= 25 ? "bg-red-500" :
    passwordStrength.percent <= 50 ? "bg-orange-500" :
    passwordStrength.percent <= 75 ? "bg-amber-500" : "bg-green-500"

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
      login(data.user)
      toast.success("Account created successfully!")
    } catch (error: any) {
      // NEVER clear form on error — spec requirement
      toast.error(error.message || "Failed to register")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="flex min-h-screen">
      {/* Left Side: Features Checklist */}
      <div className="hidden lg:flex w-1/2 bg-primary p-12 flex-col justify-between text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl mb-12 transition-opacity hover:opacity-80">
            <Logo size={40} src="/logo2.png" />
            <span>Inceptrax</span>
          </Link>
          <h2 className="text-4xl font-bold mb-8 leading-tight">
            Start building with <br /> data, not guesses.
          </h2>

          <ul className="space-y-6">
            {[
              "Unlimited idea validation analysis",
              "Deep-dive market research reports",
              "Competitor intelligence tracking",
              "AI-generated user personas",
              "Step-by-step MVP blueprints",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-lg opacity-90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-sm opacity-60">2026 Inceptrax Inc. All rights reserved.</p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
      </div>

      {/* Right Side: Register Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-12 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold mb-2">Create an account</h1>
            <p className="text-muted-foreground">Start validating your ideas for free.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  placeholder="Jane"
                  required
                  className={`h-11 rounded-xl ${touched.firstName && errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => validateField("firstName", firstName)}
                />
                {touched.firstName && errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  placeholder="Doe"
                  required
                  className={`h-11 rounded-xl ${touched.lastName && errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => validateField("lastName", lastName)}
                />
                {touched.lastName && errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                className={`h-11 rounded-xl ${touched.email && errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateField("email", email)}
              />
              {touched.email && errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password with strength meter */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  required
                  className={`h-11 rounded-xl pr-10 ${touched.password && errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (touched.password) validateField("password", e.target.value) }}
                  onBlur={() => validateField("password", password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength bar */}
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

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                required
                className={`h-11 rounded-xl ${touched.confirmPassword && errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (touched.confirmPassword) validateField("confirmPassword", e.target.value) }}
                onBlur={() => validateField("confirmPassword", confirmPassword)}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold mt-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground px-4 leading-relaxed">
            By clicking &ldquo;Create Account&rdquo;, you agree to our{" "}
            <Link href="/terms-of-service" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="text-center text-sm text-muted-foreground pt-4 border-t">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
