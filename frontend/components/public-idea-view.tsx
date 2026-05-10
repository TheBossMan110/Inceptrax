"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, Search, Target, CreditCard, Zap, Rocket, 
  Briefcase, CheckCircle2, AlertCircle, TrendingUp, ThumbsUp,
  MessageSquare, Globe, Lightbulb
} from "lucide-react"
import { IdeaComments } from "@/components/idea-comments"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ExpandableText } from "@/components/ui/expandable-text"
import Link from "next/link"

interface PublicIdeaViewProps {
  idea: any
}

export function PublicIdeaView({ idea }: PublicIdeaViewProps) {
  const [activeTab, setActiveTab] = useState("validation")
  
  const analysis = idea.analysis_data || {}
  const market = analysis.market_research || analysis.market || {}
  const competitors = analysis.competitors || []
  const monetization = analysis.monetization || {}
  const mvp = analysis.mvp_blueprint || analysis.mvp || {}
  const gtm = analysis.gtm_strategy || analysis.gtm || {}
  const investor = analysis.investor_pitches || analysis.investor || {}
  const researchHub = analysis.research_hub || analysis.execution_checklist || {}
  const competitorWatch = analysis.competitor_watch || competitors

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 pt-24 pb-12 space-y-12">

        {/* Header Section - High Contrast */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-border pb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary text-primary-foreground border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                {idea.is_public ? "Public Analysis" : "Private Shared Analysis"}
              </Badge>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Validated {new Date(idea.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none">{idea.title}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed font-medium">
              {idea.description}
            </p>
          </div>
          
          <div className="bg-card p-8 rounded-[2rem] border-2 border-border flex items-center gap-6 shrink-0 shadow-none">
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Validity Score</p>
              <p className="text-5xl font-black text-foreground tabular-nums">{analysis.overall_score || 0}%</p>
            </div>
            <div className="h-16 w-16 rounded-full border-4 border-muted border-t-primary flex items-center justify-center font-black text-xl">
              {analysis.overall_score || 0}
            </div>
          </div>
        </div>

        {/* Content Tabs - Centered & Clean */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-12">
          <div className="flex justify-center border-b border-border">
            <TabsList className="h-14 bg-transparent p-0 gap-8">
              {[
                { id: "validation", label: "Validation", icon: Sparkles },
                { id: "market", label: "Market", icon: Search },
                { id: "competitors", label: "Competitors", icon: Target },
                { id: "monetization", label: "Monetization", icon: CreditCard },
                { id: "mvp", label: "MVP Blueprint", icon: Zap },
                { id: "gtm", label: "GTM Strategy", icon: Rocket },
                { id: "investor", label: "Investor", icon: Briefcase },
                { id: "research", label: "Research", icon: Globe },
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className="rounded-none border-b-4 border-transparent px-2 py-4 transition-all data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-black uppercase tracking-widest text-[11px] gap-2 shadow-none"
                >
                  <tab.icon className="h-4 w-4" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-h-[500px]">
            {/* Validation Tab */}
            <TabsContent value="validation" className="space-y-12 animate-in fade-in duration-500 outline-none">
              <div className="grid gap-8 md:grid-cols-3">
                <Card className="border-2 border-border shadow-none bg-card rounded-3xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <ThumbsUp className="h-4 w-4" /> Market Demand
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{analysis.scores?.market_demand?.label || "Good"}</div>
                    <Progress value={analysis.scores?.market_demand?.value || 70} className="h-3 mt-4" />
                  </CardContent>
                </Card>
                <Card className="border-2 border-border shadow-none bg-card rounded-3xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" /> Severity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{analysis.scores?.problem_severity?.label || "Moderate"}</div>
                    <Progress value={analysis.scores?.problem_severity?.value || 50} className="h-3 mt-4" />
                  </CardContent>
                </Card>
                <Card className="border-2 border-border shadow-none bg-card rounded-3xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" /> Potential
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{analysis.scores?.growth_potential?.label || "High"}</div>
                    <Progress value={analysis.scores?.growth_potential?.value || 85} className="h-3 mt-4" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-12 lg:grid-cols-2">
                <Card className="border-2 border-border shadow-none overflow-hidden bg-card rounded-[2.5rem]">
                  <CardHeader className="border-b-2 border-border bg-muted/30 pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
                      <CheckCircle2 className="h-6 w-6" /> Key Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-8 p-8">
                    {(analysis.strengths || ["Strong initial niche", "Scalable business model", "Low customer acquisition cost"]).map((item: string, i: number) => (
                      <div key={i} className="flex gap-4 text-base leading-relaxed font-medium">
                        <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                          {i + 1}
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-2 border-border shadow-none overflow-hidden bg-card rounded-[2.5rem]">
                  <CardHeader className="border-b-2 border-border bg-muted/30 pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
                      <AlertCircle className="h-6 w-6" /> Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-8 p-8">
                    {(analysis.risks || ["Market saturation", "Regulatory hurdles", "Competition for talent"]).map((item: string, i: number) => (
                      <div key={i} className="flex gap-4 text-base leading-relaxed font-medium">
                         <div className="h-6 w-6 rounded-full border-2 border-foreground flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                          !
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none shadow-none bg-foreground text-background rounded-[2.5rem] p-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
                    <Sparkles className="h-8 w-8" /> Strategy Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xl leading-relaxed font-bold opacity-90">
                  {analysis.recommendation || "Detailed AI strategy analysis will appear here."}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-12 animate-in fade-in duration-500 outline-none">
              <div className="grid gap-8 md:grid-cols-3">
                {["tam", "sam", "som"].map((key) => (
                  <Card key={key} className="border-2 border-border shadow-none bg-card rounded-3xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {key.toUpperCase()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black tabular-nums">{market[key] || "N/A"}</div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">
                        {key === 'tam' ? 'Total Market' : key === 'sam' ? 'Serviceable Market' : 'Obtainable Market'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="grid gap-12 md:grid-cols-2">
                <Card className="border-2 border-border shadow-none rounded-[2.5rem]">
                   <CardHeader className="border-b-2 border-border bg-muted/30 pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
                      <Globe className="h-6 w-6" /> Market Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8 p-8 space-y-8">
                    {(market.trends || []).map((trend: any, i: number) => (
                       <div key={i} className="space-y-2">
                        <h3 className="font-black text-base uppercase tracking-tight">{trend.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">{trend.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-border shadow-none rounded-[2.5rem]">
                   <CardHeader className="border-b-2 border-border bg-muted/30 pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest">
                      <TrendingUp className="h-6 w-6" /> Competencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8 p-8 space-y-4">
                    {(analysis.core_competencies || ["AI Analysis", "Speed", "Data"]).map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border font-black text-sm uppercase tracking-widest">
                        <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Other tabs follow the same heavy B&W aesthetic... (Competitors, Monetization, MVP, GTM, Investor) */}
            {/* [Shortened for brevity but fully implemented in actual file] */}
            
            <TabsContent value="competitors" className="space-y-12 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                   {(competitors.length > 0 ? competitors : [
                    { name: "Competitor Alpha", description: "Direct competitor.", strengths: ["Brand"], weaknesses: ["Pricing"] },
                    { name: "Competitor Beta", description: "Modern startup.", strengths: ["Tech"], weaknesses: ["Market"] }
                   ]).map((comp: any, i: number) => (
                     <Card key={i} className="border-2 border-border shadow-none bg-card rounded-[2rem]">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-xl font-black uppercase tracking-tight">{comp.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-0">
                          <p className="text-sm text-muted-foreground leading-relaxed font-medium">{comp.description}</p>
                          <div className="space-y-4">
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-foreground mb-2">Strengths</p>
                               <div className="flex flex-wrap gap-2">
                                 {(comp.strengths || []).map((s: string, j: number) => <Badge key={j} variant="secondary" className="bg-muted text-foreground border-none font-bold text-[9px] px-3">{s}</Badge>)}
                               </div>
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-foreground mb-2">Weaknesses</p>
                               <div className="flex flex-wrap gap-2">
                                 {(comp.weaknesses || []).map((w: string, j: number) => <Badge key={j} variant="secondary" className="bg-muted text-foreground/60 border-none font-bold text-[9px] px-3">{w}</Badge>)}
                               </div>
                            </div>
                          </div>
                        </CardContent>
                     </Card>
                   ))}
                </div>
            </TabsContent>

            <TabsContent value="monetization" className="space-y-12 animate-in fade-in duration-500 outline-none">
                <Card className="border-2 border-border shadow-none rounded-[2.5rem] overflow-hidden">
                   <CardHeader className="bg-muted/30 border-b-2 border-border p-8">
                     <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-widest">
                       <CreditCard className="h-8 w-8" /> Revenue Streams
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="p-12 grid gap-8 md:grid-cols-2">
                      {(monetization.streams || analysis.revenue_streams || ["Subscription", "Exterprise", "API"]).map((stream: any, i: number) => (
                         <div key={i} className="p-8 rounded-[2rem] border-2 border-border flex items-start gap-6 hover:bg-muted/10 transition-colors">
                            <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0 font-black">
                               $
                            </div>
                            <div className="space-y-2">
                               <h3 className="font-black text-xl uppercase tracking-tighter">{typeof stream === 'string' ? stream : stream.name}</h3>
                               <p className="text-base text-muted-foreground leading-relaxed font-medium">
                                 {typeof stream === 'string' ? "Primary revenue channel driving consistent growth." : stream.description}
                               </p>
                            </div>
                         </div>
                      ))}
                   </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="mvp" className="space-y-12 animate-in fade-in duration-500 outline-none">
               <div className="grid gap-12 lg:grid-cols-3">
                  <Card className="md:col-span-2 border-2 border-border shadow-none rounded-[2.5rem]">
                     <CardHeader className="bg-muted/30 border-b-2 border-border p-8">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-widest">
                           <Zap className="h-8 w-8" /> MVP Core Features
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-12 space-y-8">
                        {(mvp.features || analysis.mvp_features || ["Core V1", "Dashboard", "Alerts"]).map((feature: any, i: number) => (
                           <div key={i} className="flex gap-6 p-6 rounded-[2rem] border-2 border-border">
                              <div className="h-10 w-10 rounded-full border-2 border-foreground flex items-center justify-center shrink-0 font-black">
                                {i + 1}
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-black text-lg uppercase tracking-tight">{typeof feature === 'string' ? feature : feature.title}</h4>
                                <p className="text-base text-muted-foreground font-medium">
                                  {typeof feature === 'string' ? "Essential component for the initial product launch." : feature.impact}
                                </p>
                              </div>
                           </div>
                        ))}
                     </CardContent>
                  </Card>
                  
                  <Card className="border-none shadow-none bg-muted rounded-[2.5rem] p-4">
                    <CardHeader>
                       <CardTitle className="font-black uppercase tracking-widest text-sm">MVP Goals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                       <p className="text-xl font-black leading-tight italic">
                         "Build a working prototype that solves the primary pain point."
                       </p>
                       <div className="space-y-4 pt-4 border-t-2 border-border/50">
                          {[ "3 Month Delivery", "Low Dev Cost", "PMF Signal" ].map((goal, i) => (
                            <div key={i} className="flex items-center gap-3 text-base font-black uppercase tracking-widest">
                               <CheckCircle2 className="h-5 w-5" /> {goal}
                            </div>
                          ))}
                       </div>
                    </CardContent>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="gtm" className="space-y-12 animate-in fade-in duration-500 outline-none">
                <div className="grid gap-8 md:grid-cols-2">
                   {(gtm.channels || analysis.gtm_channels || ["LinkedIn", "Content", "Forums"]).map((channel: any, i: number) => (
                     <Card key={i} className="border-2 border-border shadow-none rounded-[2rem] hover:bg-muted/10 transition-colors">
                        <CardHeader>
                           <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                              <Rocket className="h-6 w-6" /> {typeof channel === 'string' ? channel : channel.name}
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <p className="text-base text-muted-foreground leading-relaxed font-medium">
                              {typeof channel === 'string' ? "Optimized acquisition strategy to scale user base efficiently." : channel.strategy}
                           </p>
                        </CardContent>
                     </Card>
                   ))}
                </div>
            </TabsContent>

            <TabsContent value="investor" className="space-y-12 animate-in fade-in duration-500 outline-none">
               <Card className="border-2 border-border shadow-none rounded-[3rem] overflow-hidden bg-card">
                 <CardHeader className="bg-muted/30 border-b-2 border-border p-12">
                    <CardTitle className="flex items-center gap-4 text-3xl font-black uppercase tracking-widest">
                       <Briefcase className="h-10 w-10 text-foreground" /> Investor Pitch
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-20 text-center space-y-12 max-w-2xl mx-auto">
                    <div className="h-24 w-24 bg-foreground text-background rounded-full flex items-center justify-center mx-auto shadow-2xl">
                       <Briefcase className="h-12 w-12" />
                    </div>
                    <div className="space-y-6">
                      <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">{idea.title} Elevator Pitch</h2>
                      <p className="text-2xl text-muted-foreground leading-tight italic font-medium">
                        "{investor.pitch_deck_intro || "A revolutionary approach to solving market fragmentation."}"
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-8 pt-12">
                       <div className="text-center p-8 rounded-3xl bg-muted border-2 border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Target Raise</p>
                          <p className="text-3xl font-black">$500K - $1M</p>
                       </div>
                       <div className="text-center p-8 rounded-3xl bg-muted border-2 border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Valuation Cap</p>
                          <p className="text-3xl font-black">$5M - $8M</p>
                       </div>
                    </div>
                 </CardContent>
               </Card>
            </TabsContent>

            {/* Research Hub Tab */}
            <TabsContent value="research" className="space-y-8 animate-in fade-in duration-500 outline-none">
              {researchHub && typeof researchHub === 'object' && Object.keys(researchHub).length > 0 ? (
                <div className="space-y-8">
                  {/* Execution Checklist */}
                  {Array.isArray(researchHub) ? (
                    <Card className="border-2 border-border shadow-none bg-card rounded-3xl">
                      <CardHeader>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4" /> Execution Checklist
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {researchHub.map((item: any, i: number) => {
                          // Handle checklist items with step/description/phase
                          if (typeof item === 'object' && item !== null) {
                            const step = item.step || item.title || item.name || item.task || ''
                            const description = item.description || item.content || item.summary || ''
                            const phase = item.phase || ''
                            return (
                              <div key={i} className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                                {phase && (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{phase}</span>
                                )}
                                {step && <p className="text-sm font-bold text-foreground">{step}</p>}
                                {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
                                {!step && !description && (
                                  <p className="text-sm text-foreground">
                                    {Object.values(item).filter(v => typeof v === 'string').join(' — ')}
                                  </p>
                                )}
                              </div>
                            )
                          }
                          return (
                            <div key={i} className="p-4 rounded-2xl bg-muted/30 border border-border">
                              <p className="text-sm text-foreground">{String(item)}</p>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  ) : (
                    // Object-based hub data (research_links, execution_checklist, etc.)
                    Object.entries(researchHub).map(([key, value]: [string, any], i: number) => (
                      <Card key={i} className="border-2 border-border shadow-none bg-card rounded-3xl">
                        <CardHeader>
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4" /> {key.replace(/_/g, ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {typeof value === 'string' ? (
                            <p className="text-sm text-foreground leading-relaxed">{value}</p>
                          ) : Array.isArray(value) ? (
                            value.map((v: any, j: number) => {
                              if (typeof v === 'string') {
                                return (
                                  <div key={j} className="flex gap-2 text-sm text-foreground">
                                    <span className="text-muted-foreground shrink-0">•</span>
                                    <span>{v}</span>
                                  </div>
                                )
                              }
                              if (typeof v === 'object' && v !== null) {
                                const title = v.step || v.title || v.name || v.task || ''
                                const desc = v.description || v.content || v.relevance || v.use_case || v.summary || ''
                                const phase = v.phase || v.category || v.type || ''
                                return (
                                  <div key={j} className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                                    {phase && (
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{phase}</span>
                                    )}
                                    {title && <p className="text-sm font-bold text-foreground">{title}</p>}
                                    {desc && <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>}
                                    {!title && !desc && (
                                      <p className="text-sm text-foreground">
                                        {Object.values(v).filter((val: any) => typeof val === 'string').join(' — ')}
                                      </p>
                                    )}
                                  </div>
                                )
                              }
                              return (
                                <div key={j} className="flex gap-2 text-sm text-foreground">
                                  <span className="text-muted-foreground shrink-0">•</span>
                                  <span>{String(v)}</span>
                                </div>
                              )
                            })
                          ) : typeof value === 'object' && value !== null ? (
                            <div className="space-y-1">
                              {Object.entries(value).map(([k2, v2]: [string, any], j: number) => (
                                <p key={j} className="text-sm text-foreground"><span className="font-semibold">{k2.replace(/_/g, ' ')}:</span> {String(v2)}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-foreground">{String(value)}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <Card className="border-2 border-border shadow-none bg-card rounded-3xl">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground text-sm italic">Research hub data will appear after full analysis.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Comments Section */}
        <div className="pt-24 pb-20 border-t-2 border-border mt-24">
           <div className="max-w-4xl mx-auto">
              <IdeaComments shareToken={idea.share_token} />
           </div>
        </div>
      </main>

      <Footer />

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border py-4 px-6 z-50">
        <div className="container mx-auto flex items-center justify-between max-w-4xl">
          <div>
            <p className="text-sm font-bold text-foreground">Want to validate your startup idea?</p>
            <p className="text-xs text-muted-foreground">Get AI-powered analysis, market research, and competitor intelligence — free.</p>
          </div>
          <Link
            href="/dashboard/new-idea"
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Validate your own idea free →
          </Link>
        </div>
      </div>
    </div>
  )
}

