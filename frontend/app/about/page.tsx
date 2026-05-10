import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Users, Globe, Target, Lightbulb, Heart, Zap } from "lucide-react";



export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-grow py-20">
        <div className="container px-4 max-w-5xl mx-auto space-y-20">

          {/* Mission & Vision Section */}
          <section className="text-center space-y-10">
            <h1 className="text-4xl md:text-6xl font-bold text-primary tracking-tight">One Mission: <br />Democratize Startup Success</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We believe that no great execution should be wasted on a flawed premise, and no great idea should die due to a lack of strategic clarity.
            </p>

            <div className="grid gap-8 py-8 md:grid-cols-2 text-left">
              <div className="group p-8 border border-border rounded-3xl bg-card hover:border-primary transition-colors">
                <div className="flex items-center gap-4 text-primary mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Our Purpose</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To eliminate the &quot;False Start.&quot; Founders often spend months building products that nobody wants. We provide the friction needed to ground dreams in reality, or the validation needed to soar.
                </p>
              </div>
              <div className="group p-8 border border-border rounded-3xl bg-card hover:border-primary transition-colors">
                <div className="flex items-center gap-4 text-primary mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Our Vision</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  A world where high-quality market intelligence isn&apos;t reserved for Fortune 500s or VC-backed darlings, but available to every student, builder, and dreamer in their dorm room.
                </p>
              </div>
            </div>
          </section>

          {/* Why We Built It */}
          <section className="bg-muted/30 rounded-3xl p-10 md:p-16 text-center">
            <h2 className="text-3xl font-bold mb-6">Why We Built Inceptrax</h2>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground mb-8">
              We&apos;ve been there. We&apos;ve burnt savings on marketing campaigns for audiences that didn&apos;t exist. We&apos;ve built features nobody used.
            </p>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground">
              The &quot;Lean Startup&quot; methodology is great, but it&apos;s slow. Validation used to mean weeks of customer interviews and landing page tests. We built Inceptrax to condense that process into minutes using Generative AI.
            </p>
          </section>

          {/* Who It's For */}
          <section className="space-y-12">
            <h2 className="text-3xl font-bold text-center text-primary">Who We Serve</h2>
            <div className="grid gap-6 md:grid-cols-4">
              {[
                { icon: Target, title: "Indie Hackers", desc: "Move fast and break nothing. Validate before coding." },
                { icon: Lightbulb, title: "Founders", desc: "Seek clarity before your first line of code." },
                { icon: Users, title: "Product Mgrs", desc: "Validate internal features before engineering handoff." },
                { icon: Heart, title: "Students", desc: "Learn business modelling with real-world feedback." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center p-6 text-center bg-card border border-border rounded-2xl shadow-sm hover:shadow-lg transition-all h-full">
                  <item.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          

        </div>
      </main>

      <Footer />
    </div>
  )
}
