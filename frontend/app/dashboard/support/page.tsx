"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Mail, MessageSquare, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

export default function SupportPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ... inside component ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await apiFetch("/support", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, message }),
      })

      toast.success("Your message has been sent! Our team will contact you soon.")
      setName("")
      setEmail("")
      setSubject("")
      setMessage("")
    } catch (error: any) {
      toast.error(error.message || "Failed to send your message. Please try again later.")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Support Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Have questions or need assistance? Submit a ticket below or check our FAQ.
        </p>
      </div>

      {/* Support Form */}
      <Card className="card-premium rounded-2xl border-none shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-brand-cyan" />
            </div>
            Submit a Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Your Name"
                className="rounded-xl bg-white/[0.03] border-white/[0.08] focus-visible:border-brand/40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Your Email"
                className="rounded-xl bg-white/[0.03] border-white/[0.08] focus-visible:border-brand/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Input
              placeholder="Subject"
              className="rounded-xl bg-white/[0.03] border-white/[0.08] focus-visible:border-brand/40"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Textarea
              placeholder="Message"
              className="rounded-xl bg-white/[0.03] border-white/[0.08] focus-visible:border-brand/40"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl gap-2 bg-primary hover:bg-primary/90 glow-primary shimmer press"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="card-premium rounded-2xl border-none shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
              <HelpCircle className="h-4 w-4 text-brand-cyan" />
            </div>
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <p className="font-semibold text-sm text-foreground">How do I reset my password?</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Go to your profile settings, click “Change Password,” and follow the instructions to reset your password.
            </p>
          </div>
          <div className="divider-glow" />
          <div className="space-y-1.5">
            <p className="font-semibold text-sm text-foreground">How can I download my reports?</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Navigate to the “Reports” section in your dashboard. You can download individual reports or export all data as a ZIP.
            </p>
          </div>
          <div className="divider-glow" />
          <div className="space-y-1.5">
            <p className="font-semibold text-sm text-foreground">How long does it take to generate a custom report?</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Most custom reports are generated within a few minutes. You’ll receive a notification when your report is ready.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="card-premium rounded-2xl border-none shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-brand-cyan" />
            </div>
            Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <p className="text-sm text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 mr-2">Email</span>
            <span className="text-foreground font-medium">support@inceptrax.com</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 mr-2">Working Hours</span>
            <span className="text-foreground font-medium">Mon–Fri, 9AM – 6PM</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 mr-2">Response Time</span>
            <span className="text-foreground font-medium">Typically within 24 hours</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
