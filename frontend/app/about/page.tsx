import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Aurora, Reveal, RevealGroup, RevealItem, SpotlightCard } from "@/components/fx"
import { Users, Globe, Target, Lightbulb, Heart, Zap } from "lucide-react"

const audiences = [
  { icon: Target, title: "Indie Hackers", desc: "Move fast and break nothing. Validate before coding." },
  { icon: Lightbulb, title: "Founders", desc: "Seek clarity before your first line of code." },
  { icon: Users, title: "Product Mgrs", desc: "Validate internal features before engineering handoff." },
  { icon: Heart, title: "Students", desc: "Learn business modelling with real-world feedback." },
]

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-grow">
        {/* ── Hero: Mission ─────────────────────────────────── */}
        <section className="relative pt-36 pb-16 md:pt-44 md:pb-20 overflow-hidden">
          <Aurora />
          <div className="container px-4 relative z-10 max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="eyebrow mb-4">About Inceptrax</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-balance mb-6 text-gradient-subtle">
                One Mission: <br />
                Democratize Startup{" "}
                <span className="accent-serif text-gradient glow-text">Success</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                We believe that no great execution should be wasted on a flawed premise, and no
                great idea should die due to a lack of strategic clarity.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Purpose & Vision ──────────────────────────────── */}
        <section className="pb-20 md:pb-24">
          <div className="container px-4 max-w-5xl mx-auto">
            <RevealGroup className="grid gap-5 md:grid-cols-2 text-left">
              <RevealItem>
                <SpotlightCard className="p-8 h-full card-premium-hover">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                    <Zap className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight mb-3">Our Purpose</h2>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                    To eliminate the &quot;False Start.&quot; Founders often spend months building
                    products that nobody wants. We provide the friction needed to ground dreams in
                    reality, or the validation needed to soar.
                  </p>
                </SpotlightCard>
              </RevealItem>
              <RevealItem>
                <SpotlightCard className="p-8 h-full card-premium-hover">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-5">
                    <Globe className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight mb-3">Our Vision</h2>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                    A world where high-quality market intelligence isn&apos;t reserved for Fortune
                    500s or VC-backed darlings, but available to every student, builder, and dreamer
                    in their dorm room.
                  </p>
                </SpotlightCard>
              </RevealItem>
            </RevealGroup>
          </div>
        </section>

        {/* ── Why We Built It ───────────────────────────────── */}
        <section className="pb-20 md:pb-24 px-4">
          <Reveal className="container max-w-4xl mx-auto">
            <div className="relative rounded-3xl border-gradient overflow-hidden text-center px-6 py-14 md:px-16 md:py-16">
              <Aurora intensity="subtle" grid={false} />
              <div className="relative z-10">
                <p className="eyebrow mb-4">Our story</p>
                <h2 className="mb-6 text-gradient-subtle">
                  Why We Built <span className="accent-serif text-gradient">Inceptrax</span>
                </h2>
                <p className="max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed mb-6">
                  We&apos;ve been there. We&apos;ve burnt savings on marketing campaigns for
                  audiences that didn&apos;t exist. We&apos;ve built features nobody used.
                </p>
                <div className="divider-glow max-w-xs mx-auto mb-6" />
                <p className="max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
                  The &quot;Lean Startup&quot; methodology is great, but it&apos;s slow. Validation
                  used to mean weeks of customer interviews and landing page tests. We built
                  Inceptrax to condense that process into minutes using Generative AI.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Who It's For ──────────────────────────────────── */}
        <section className="pb-24 md:pb-28">
          <div className="container px-4 max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Reveal>
                <p className="eyebrow mb-4">Who it&apos;s for</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="text-gradient-subtle">
                  Who We <span className="accent-serif text-gradient">Serve</span>
                </h2>
              </Reveal>
            </div>

            <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map((item) => (
                <RevealItem key={item.title}>
                  <SpotlightCard className="p-6 h-full card-premium-hover text-center">
                    <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center mb-4">
                      <item.icon className="h-5 w-5 text-brand-cyan" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
