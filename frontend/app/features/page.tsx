import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CheckCircle2, Search, Target, Users, Rocket, BarChart3, TrendingUp, Layers, LayoutDashboard } from "lucide-react"

const features = [
  {
    title: "AI Idea Validation",
    description: "An instant, unbiased audit of your startup concept. We grade your idea on Problem-Solution fit, uniqueness, and feasibility so you know if it's worth pursuing.",
    details: "Uses multi-model reasoning to simulate VC scrutiny on your pitch.",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Market & Competitor Analysis",
    description: "Deep-dive intelligence on your industry. Instantly identify who you're fighting against and how big the prize is (TAM/SAM/SOM).",
    details: "Scans thousands of market signals to find hidden competitors manual research misses.",
    icon: Search,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Validation Score System",
    description: "A proprietary 0-100 score indicating your startup's potential success rate. A single, clear metric to benchmark your ideas.",
    details: "Weighted algorithm factoring in market saturation, technical complexity, and demand.",
    icon: TrendingUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "AI Reports & Insights",
    description: "Comprehensive, exportable business dossiers. Get a shared document for your co-founders or investors including monetization models and risks.",
    details: "Generates professional-grade documentation that looks like it took weeks to write.",
    icon: Layers,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "GTM Strategy Assistance",
    description: "Your roadmap to $1M ARR. We identify specific marketing channels, content strategies, and sales funnels for your niche.",
    details: "Matches your business model with proven growth patterns from successful startups.",
    icon: Rocket,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    title: "Dashboard & Progress Tracking",
    description: "A central command center for all your potential ventures. Compare multiple ideas side-by-side and track evolution.",
    details: "Dynamic re-scoring as you update your idea inputs.",
    icon: LayoutDashboard,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
]

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <section className="py-20 lg:py-32 bg-muted/30">
          <div className="container px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              The <span className="text-primary">Feature Suite</span> for Modern Founders
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              Everything you need to go from &quot;hunch&quot; to &quot;validated business model&quot; without wasting time or money.
            </p>
          </div>
        </section>

        <section className="py-24">
          <div className="container px-4">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex flex-col p-8 rounded-3xl border border-border bg-card hover:shadow-xl transition-all duration-300"
                >
                  <div
                    className={`h-14 w-14 rounded-2xl ${feature.bgColor} ${feature.color} flex items-center justify-center mb-6`}
                  >
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6 flex-grow">{feature.description}</p>

                  <div className="pt-6 border-t border-border/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">The AI Edge</p>
                    <p className="text-sm text-foreground/80 font-medium">{feature.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-primary text-primary-foreground overflow-hidden relative">
          <div className="container px-4 relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Built for speed, designed for clarity.</h2>
            <p className="text-lg text-primary-foreground/80 mb-12">
              Stop using spreadsheets and disjointed tools. Inceptrax brings your entire validation workflow into one intelligent platform.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">2 min</div>
                <div className="text-sm opacity-80">Average Analysis Time</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">20+</div>
                <div className="text-sm opacity-80">Data Points Analyzed</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-sm opacity-80">Objective Feedback</div>
              </div>
            </div>
          </div>

          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')] pointer-events-none" />
        </section>
      </main>
      <Footer />
    </div>
  )
}
