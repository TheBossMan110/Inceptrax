"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Menu, ArrowRight } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Compass, Sparkles, Info, Mail, LogOut, ChevronRight } from "lucide-react"

const NAV_LINKS = [
  { label: "Explore", href: "/public-ideas", icon: Compass },
  { label: "Features", href: "/features", icon: Sparkles },
  { label: "About", href: "/about", icon: Info },
  { label: "Contact", href: "/contact", icon: Mail },
]

export function Navbar() {
  const { user, isAuthenticated, loading } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", handler, { passive: true })
    handler()
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto flex items-center justify-between w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled
            ? "mt-3 mx-3 md:mx-6 max-w-5xl rounded-2xl glass-strong shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] px-4 h-14"
            : "mt-0 mx-0 max-w-none rounded-none bg-transparent border-b border-transparent px-4 md:px-8 h-[72px]"
        )}
      >
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-lg tracking-tight transition-opacity hover:opacity-80"
          >
            <Logo size={30} />
            <span className="text-gradient-subtle">Inceptrax</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-sm font-medium text-muted-foreground">
                    {user.first_name || user.name || ""}
                  </span>
                  <Button
                    size="sm"
                    className="gap-2 text-xs rounded-xl bg-primary hover:bg-primary/90 glow-primary press"
                    asChild
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-4 rounded-xl text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs px-4 rounded-xl gap-1.5 bg-primary hover:bg-primary/90 glow-primary shimmer press"
                    asChild
                  >
                    <Link href="/register">
                      Get Started
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] glass-strong border-l border-white/10">
                <SheetHeader className="text-left pb-6 border-b border-white/[0.06]">
                  <SheetTitle className="flex items-center gap-2">
                    <Logo />
                    <span className="text-gradient-subtle font-semibold">Inceptrax</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 py-8">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center justify-between px-3 py-3 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all duration-200"
                      >
                        <span className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 text-brand/70" />
                          {link.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                      </Link>
                    </SheetClose>
                  ))}

                  <div className="my-6 divider-glow" />

                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <SheetClose asChild>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors glow-primary"
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          Go to Dashboard
                        </Link>
                      </SheetClose>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-3 py-6 h-auto rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          window.location.href = "/login"
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <SheetClose asChild>
                        <Link href="/register">
                          <Button className="w-full h-12 rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary press">
                            Get Started Free
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl border-white/10 hover:bg-white/[0.05]"
                          >
                            Sign In
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
