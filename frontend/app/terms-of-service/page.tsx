import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Aurora } from "@/components/fx"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Inceptrax Terms of Service — rules, responsibilities, and usage guidelines.",
}

/** Section heading with a small brand accent bar. */
function LegalHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground">
      <span
        aria-hidden
        className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-cyan via-brand to-brand-violet"
      />
      {children}
    </h2>
  )
}

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative pt-36 pb-10 md:pt-44 md:pb-12 overflow-hidden">
          <Aurora intensity="subtle" />
          <div className="container px-4 max-w-3xl mx-auto relative z-10">
            <p className="eyebrow mb-4">Legal</p>
            <h1 className="mb-3 text-gradient-subtle">
              Terms of <span className="accent-serif text-gradient">Service</span>
            </h1>
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground/80">
              Last updated: April 28, 2026
            </p>
          </div>
        </section>

        {/* ── Body ─────────────────────────────────────────── */}
        <section className="pb-24">
          <div className="container px-4 max-w-3xl mx-auto">
            <div className="divider-glow mb-10" />

            <div className="animate-fade-up space-y-12 text-foreground/75 leading-relaxed text-[15px] marker:text-brand/70">

              <section className="space-y-4">
                <LegalHeading>1. Acceptance of Terms</LegalHeading>
                <p>By accessing or using Inceptrax (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. Your continued use of the Service constitutes acceptance of any changes to these terms.</p>
              </section>

              <section className="space-y-4">
                <LegalHeading>2. Description of Service</LegalHeading>
                <p>Inceptrax is an AI-powered startup idea validation and business planning platform. The Service provides:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Multi-stage AI analysis of startup ideas (validation, market research, competitor analysis, monetization, MVP planning, go-to-market strategy)</li>
                  <li>AI-generated business plans, investor pitches, and reports</li>
                  <li>PDF and PowerPoint export of analysis results</li>
                  <li>Community features including idea sharing and messaging</li>
                  <li>Competitor monitoring and market intelligence</li>
                </ul>
              </section>

              <section className="space-y-4">
                <LegalHeading>3. User Responsibilities</LegalHeading>
                <p>When using Inceptrax, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and truthful information when creating your account and submitting ideas.</li>
                  <li>Not use the Service for any illegal, fraudulent, or harmful purposes.</li>
                  <li>Not attempt to reverse-engineer, hack, or compromise the security of the platform.</li>
                  <li>Not submit content that is offensive, defamatory, or violates the rights of others.</li>
                  <li>Keep your account credentials secure and not share them with others.</li>
                  <li>Comply with all applicable laws and regulations in your jurisdiction.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <LegalHeading>4. Intellectual Property</LegalHeading>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground/90">Your Ideas:</strong> You retain full ownership of all startup ideas, business concepts, and descriptions you submit to Inceptrax. We do not claim any intellectual property rights over your ideas.</li>
                  <li><strong className="text-foreground/90">AI-Generated Content:</strong> Analysis reports, business plans, investor pitches, and other AI-generated outputs are provided for your use. You may use, modify, and distribute these outputs freely.</li>
                  <li><strong className="text-foreground/90">Platform IP:</strong> The Inceptrax platform, brand, UI design, codebase, and AI models are the intellectual property of Inceptrax Inc. You may not copy, modify, or distribute the platform itself.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <LegalHeading>5. AI-Generated Content Disclaimer</LegalHeading>
                <p className="font-semibold text-foreground/90">Important: AI-generated analysis, business plans, financial projections, and recommendations provided by Inceptrax are for informational purposes only.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>AI outputs do <strong className="text-foreground/90">not</strong> constitute professional legal, financial, investment, or business advice.</li>
                  <li>Market data, competitor information, and financial projections are AI-estimated and may not be 100% accurate.</li>
                  <li>You should consult qualified professionals before making significant business or investment decisions based on AI-generated content.</li>
                  <li>Inceptrax is not liable for any decisions made based on AI-generated analysis.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <LegalHeading>6. Account Termination</LegalHeading>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground/90">By You:</strong> You may delete your account at any time by contacting us. Upon deletion, all your data will be permanently removed.</li>
                  <li><strong className="text-foreground/90">By Us:</strong> We reserve the right to suspend or terminate accounts that violate these terms, engage in abusive behavior, or attempt to compromise the platform&apos;s security. We will provide notice when possible.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <LegalHeading>7. Limitation of Liability</LegalHeading>
                <p>To the maximum extent permitted by applicable law:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Inceptrax is provided &quot;as is&quot; without warranties of any kind, express or implied.</li>
                  <li>We do not guarantee the accuracy, completeness, or usefulness of any AI-generated content.</li>
                  <li>Inceptrax shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
                  <li>Our total liability for any claim related to the Service shall not exceed the amount you paid us in the 12 months prior to the claim.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <LegalHeading>8. Changes to Terms</LegalHeading>
                <p>We may update these Terms of Service from time to time. When we make material changes, we will notify you via email or a prominent notice on the platform. Your continued use of the Service after changes are posted constitutes acceptance of the updated terms.</p>
              </section>

              <section className="space-y-4">
                <LegalHeading>9. Contact Information</LegalHeading>
                <p>For questions about these terms, contact us at:</p>
                <p className="font-semibold text-brand-cyan">legal@inceptrax.com</p>
              </section>

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
