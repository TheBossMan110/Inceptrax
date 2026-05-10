import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Inceptrax Terms of Service — rules, responsibilities, and usage guidelines.",
}

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-20">
        <div className="container px-4 max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: April 28, 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/80 leading-relaxed text-[15px]">

            <section>
              <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
              <p>By accessing or using Inceptrax (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. Your continued use of the Service constitutes acceptance of any changes to these terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
              <p>Inceptrax is an AI-powered startup idea validation and business planning platform. The Service provides:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Multi-stage AI analysis of startup ideas (validation, market research, competitor analysis, monetization, MVP planning, go-to-market strategy)</li>
                <li>AI-generated business plans, investor pitches, and reports</li>
                <li>PDF and PowerPoint export of analysis results</li>
                <li>Community features including idea sharing and messaging</li>
                <li>Competitor monitoring and market intelligence</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">3. User Responsibilities</h2>
              <p>When using Inceptrax, you agree to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate and truthful information when creating your account and submitting ideas.</li>
                <li>Not use the Service for any illegal, fraudulent, or harmful purposes.</li>
                <li>Not attempt to reverse-engineer, hack, or compromise the security of the platform.</li>
                <li>Not submit content that is offensive, defamatory, or violates the rights of others.</li>
                <li>Keep your account credentials secure and not share them with others.</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">4. Intellectual Property</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Your Ideas:</strong> You retain full ownership of all startup ideas, business concepts, and descriptions you submit to Inceptrax. We do not claim any intellectual property rights over your ideas.</li>
                <li><strong>AI-Generated Content:</strong> Analysis reports, business plans, investor pitches, and other AI-generated outputs are provided for your use. You may use, modify, and distribute these outputs freely.</li>
                <li><strong>Platform IP:</strong> The Inceptrax platform, brand, UI design, codebase, and AI models are the intellectual property of Inceptrax Inc. You may not copy, modify, or distribute the platform itself.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">5. AI-Generated Content Disclaimer</h2>
              <p className="font-semibold">Important: AI-generated analysis, business plans, financial projections, and recommendations provided by Inceptrax are for informational purposes only.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>AI outputs do <strong>not</strong> constitute professional legal, financial, investment, or business advice.</li>
                <li>Market data, competitor information, and financial projections are AI-estimated and may not be 100% accurate.</li>
                <li>You should consult qualified professionals before making significant business or investment decisions based on AI-generated content.</li>
                <li>Inceptrax is not liable for any decisions made based on AI-generated analysis.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">6. Account Termination</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>By You:</strong> You may delete your account at any time by contacting us. Upon deletion, all your data will be permanently removed.</li>
                <li><strong>By Us:</strong> We reserve the right to suspend or terminate accounts that violate these terms, engage in abusive behavior, or attempt to compromise the platform&apos;s security. We will provide notice when possible.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">7. Limitation of Liability</h2>
              <p>To the maximum extent permitted by applicable law:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Inceptrax is provided &quot;as is&quot; without warranties of any kind, express or implied.</li>
                <li>We do not guarantee the accuracy, completeness, or usefulness of any AI-generated content.</li>
                <li>Inceptrax shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
                <li>Our total liability for any claim related to the Service shall not exceed the amount you paid us in the 12 months prior to the claim.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">8. Changes to Terms</h2>
              <p>We may update these Terms of Service from time to time. When we make material changes, we will notify you via email or a prominent notice on the platform. Your continued use of the Service after changes are posted constitutes acceptance of the updated terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground">9. Contact Information</h2>
              <p>For questions about these terms, contact us at:</p>
              <p className="font-semibold">legal@inceptrax.com</p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
