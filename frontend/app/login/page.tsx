"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

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
    <div className="flex min-h-screen">
      {/* Left Side: Branding/Content */}
      <div className="hidden lg:flex w-1/2 bg-primary p-12 flex-col justify-between text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl mb-12 transition-opacity hover:opacity-80">
            <Logo size={40} src="/logo2.png" />
            <span>Inceptrax</span>
          </Link>
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            The secret weapon for <br /> successful founders.
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Join thousands of entrepreneurs who use our AI to validate, research, and plan their next big venture.
          </p>
        </div>

        <div className="relative z-10 p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          <p className="italic text-lg mb-4">
            &ldquo;Inceptrax saved us months of wasted effort. We validated our concept in minutes and pivoted before building
            the wrong thing.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20" />
            <div>
              <p className="font-semibold text-sm">Ahmed Khan</p>
              <p className="text-primary-foreground/60 text-xs">Inceptrax</p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-12 relative">
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">Enter your credentials to access your dashboard</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                className={`h-11 rounded-xl ${touched.email && errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (touched.email) validateField("email", e.target.value) }}
                onBlur={() => validateField("email", email)}
              />
              {touched.email && errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
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
              {touched.password && errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
            By continuing, you agree to our{" "}
            <Link href="/terms-of-service" className="underline hover:text-primary">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
