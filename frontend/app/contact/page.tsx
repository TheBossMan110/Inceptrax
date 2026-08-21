"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Aurora, Reveal } from "@/components/fx"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify(formData)
      })
      toast.success("Message sent successfully!")
      setFormData({ name: "", email: "", subject: "", message: "" })
    } catch (error: any) {
      toast.error(error.message || "Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-24 overflow-hidden">
          <Aurora />
          <div className="container px-4 relative z-10 max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Reveal>
                <p className="eyebrow mb-4">Contact</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mb-4 text-gradient-subtle">
                  Get in <span className="accent-serif text-gradient glow-text">touch</span>
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Have questions or feedback? We&apos;d love to hear from you.
                </p>
              </Reveal>
            </div>

            <Reveal delay={0.24} y={32}>
              <div className="relative rounded-2xl border-gradient p-1.5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
                <div className="rounded-[14px] glass-strong p-6 md:p-8">
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                          Name
                        </Label>
                        <Input
                          id="name"
                          placeholder="Your Name"
                          className="rounded-xl bg-white/[0.03] border-white/10"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jane@example.com"
                          className="rounded-xl bg-white/[0.03] border-white/10"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-xs font-medium text-muted-foreground">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        placeholder="What is this about?"
                        className="rounded-xl bg-white/[0.03] border-white/10"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-xs font-medium text-muted-foreground">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="How can we help you?"
                        className="min-h-[150px] rounded-xl bg-white/[0.03] border-white/10"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 text-base rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send Message <Send className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
