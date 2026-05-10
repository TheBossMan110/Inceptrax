"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Menu } from "lucide-react"
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
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handler, { passive: true })
    handler()
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full",
        "transition-all duration-300 ease-in-out",
        scrolled
          ? "h-14 bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "h-16 bg-transparent border-b border-transparent"
      )}
    >
      <div className="container h-full flex items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl transition-opacity hover:opacity-80">
            <Logo />
            <span>Inceptrax</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150"
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
                  <span className="hidden sm:block text-sm font-medium">
                    {user.first_name || user.name || ""}
                  </span>
                  <Button size="sm" className="gap-2 text-xs rounded-lg" asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs px-3" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button size="sm" className="text-xs px-3 rounded-lg" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader className="text-left pb-6 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Logo />
                    <span>Inceptrax</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 py-8">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center justify-between px-3 py-3 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                      >
                        <span className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 text-muted-foreground/70" />
                          {link.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                      </Link>
                    </SheetClose>
                  ))}

                  <div className="my-6 border-t border-border" />

                  {isAuthenticated ? (
                    <div className="space-y-4">
                       <SheetClose asChild>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          Go to Dashboard
                        </Link>
                      </SheetClose>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-3 py-6 h-auto rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        onClick={() => {
                          // Access auth context logout if possible, or just trigger a redirect/refresh
                          window.location.href = "/login"
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <SheetClose asChild>
                        <Link href="/login">
                          <Button variant="outline" className="w-full h-12 rounded-xl justify-start px-4">
                            Sign In
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/register">
                          <Button className="w-full h-12 rounded-xl justify-start px-4">
                            Get Started Free
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
