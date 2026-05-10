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
    <div className="max-w-5xl mx-auto space-y-8 py-12 px-4">
      <h1 className="text-3xl font-bold text-foreground mb-2">Support Center</h1>
      <p className="text-muted-foreground mb-8">
        Have questions or need assistance? Submit a ticket below or check our FAQ.
      </p>

      {/* Support Form */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Submit a Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Textarea
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">How do I reset my password?</p>
            <p className="text-muted-foreground text-sm">
              Go to your profile settings, click “Change Password,” and follow the instructions to reset your password.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">How can I download my reports?</p>
            <p className="text-muted-foreground text-sm">
              Navigate to the “Reports” section in your dashboard. You can download individual reports or export all data as a ZIP.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">How long does it take to generate a custom report?</p>
            <p className="text-muted-foreground text-sm">
              Most custom reports are generated within a few minutes. You’ll receive a notification when your report is ready.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Email:</span> support@inceptrax.com
          </p>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Working Hours:</span> Mon-Fri, 9AM - 6PM
          </p>
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Response Time:</span> Typically within 24 hours
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
