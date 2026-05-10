import Link from "next/link"
import { Logo } from "@/components/logo"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12 lg:py-16">
      <div className="container px-4">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-6">
              <Logo size={32} />
              <span>Inceptrax</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Empowering founders to build better startups with AI-driven analysis and market intelligence.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link href="/features" className="hover:text-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="hover:text-primary">
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-primary">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy-policy" className="hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© 2026 Inceptrax Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="https://x.com/hmzaakram00" className="hover:text-primary transition-colors">
              Twitter
            </Link>
            <Link href="https://www.linkedin.com/in/hamza-akram-7ba804394?utm_source=share_via&utm_content=profile&utm_medium=member_android" className="hover:text-primary transition-colors">
              LinkedIn
            </Link>
            <Link href="https://github.com/HmzaAkram" className="hover:text-primary transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
