import Link from "next/link"
import { Logo } from "@/components/logo"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Explore Ideas", href: "/public-ideas" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative hairline-t bg-[oklch(0.105_0.016_285)] overflow-hidden">
      <div className="container px-4 md:px-8 pt-16 lg:pt-20 pb-10 relative z-10">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-xl mb-5 tracking-tight">
              <Logo size={34} />
              <span className="text-gradient-subtle">Inceptrax</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Empowering founders to build better startups with AI-driven
              analysis and market intelligence. Validate before you build.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="eyebrow mb-5">{col.title}</h4>
              <ul className="space-y-3.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© 2026 Inceptrax Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="https://x.com/TODO_ZAKI_FILL_THIS" className="hover:text-foreground transition-colors">
              Twitter
            </Link>
            <Link href="https://linkedin.com/in/TODO_ZAKI_FILL_THIS" className="hover:text-foreground transition-colors">
              LinkedIn
            </Link>
            <Link href="https://github.com/TODO_ZAKI_FILL_THIS" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </div>

      {/* Giant fading wordmark */}
      <div
        aria-hidden
        className="pointer-events-none select-none text-center font-semibold tracking-tighter leading-none translate-y-[22%] bg-gradient-to-b from-white/[0.05] to-transparent bg-clip-text text-transparent"
        style={{ fontSize: "clamp(5rem, 18vw, 16rem)" }}
      >
        INCEPTRAX
      </div>
    </footer>
  )
}
