"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Shield, User, Users, AlertTriangle, Bell, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/* ── Password strength ──────────────────────────────────────── */
function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" }
  let score = 0
  if (pw.length >= 8)           score++
  if (pw.length >= 12)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: "Weak",   color: "#ef4444" }
  if (score <= 3) return { level: 2, label: "Fair",   color: "#f59e0b" }
  if (score === 4) return { level: 3, label: "Good",  color: "#22c55e" }
  return                        { level: 4, label: "Strong", color: "#ffffff" }
}

/* ── Toggle row ─────────────────────────────────────────────── */
function ToggleRow({ id, label, description, checked, onCheckedChange }: {
  id: string; label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export default function SettingsPage() {
  const { logout } = useAuth()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savingCF, setSavingCF] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [password, setPassword] = useState("")
  const pwStrength = getPasswordStrength(password)

  const [notifs, setNotifs] = useState({
    email_analysis: true, cofounder_msg: true, platform_updates: false,
  })
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" })
  const [coFounderForm, setCoFounderForm] = useState({
    is_discoverable: false, bio: "", skills: "", looking_for: "", linkedin_url: "",
  })

  async function fetchProfile() {
    try {
      const res = await apiFetch("/users/profile")
      setForm(res.data.user)
      setCoFounderForm({
        is_discoverable: res.data.user.is_discoverable || false,
        bio:          res.data.user.bio || "",
        skills:       res.data.user.skills || "",
        looking_for:  res.data.user.looking_for || "",
        linkedin_url: res.data.user.linkedin_url || "",
      })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProfile() }, [])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await apiFetch("/users/profile", { method: "PUT", body: JSON.stringify(form) })
      toast.success("Profile updated", { description: "Your changes have been saved." })
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message || "Please try again." })
    } finally { setSaving(false) }
  }

  async function handleSaveCoFounder() {
    setSavingCF(true)
    try {
      await apiFetch("/cofounder/profile", { method: "PUT", body: JSON.stringify(coFounderForm) })
      toast.success(coFounderForm.is_discoverable ? "You are now discoverable" : "Co-founder settings saved",
        { description: "Changes applied." })
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message || "Please try again." })
    } finally { setSavingCF(false) }
  }

  async function handleResetPassword() {
    if (!password) { toast.error("Enter a new password"); return }
    if (pwStrength.level < 2) { toast.error("Password too weak", { description: "Use at least 8 characters." }); return }
    try {
      await apiFetch("/users/reset-password", { method: "PUT", body: JSON.stringify({ new_password: password }) })
      toast.success("Password updated", { description: "Your password has been changed." })
      setPassword("")
    } catch (err: any) {
      toast.error("Failed to reset password", { description: err.message || "Please try again." })
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      toast.error("Type DELETE to confirm"); return
    }
    try {
      await apiFetch("/users/delete-account", { method: "DELETE" })
      toast.success("Account deleted")
      logout()
    } catch (err: any) {
      toast.error("Failed to delete account", { description: err.message || "Please try again." })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your settings…</p>
        </div>
      </div>
    )
  }

  const initials = `${form.first_name?.[0] || ""}${form.last_name?.[0] || ""}`.toUpperCase() || "U"

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account and preferences</p>
      </div>

      {/* ── SECTION 1: Profile ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-foreground text-background flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-semibold">{form.first_name} {form.last_name}</p>
              <p className="text-sm text-muted-foreground">{form.email}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { id: "first_name", label: "First Name", key: "first_name" as const },
              { id: "last_name",  label: "Last Name",  key: "last_name"  as const },
            ].map(({ id, label, key }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input id={id} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSaveProfile} loading={saving}>Save Profile</Button>
        </CardContent>
      </Card>

      {/* ── SECTION 2: Security ────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password strength bar */}
            {password && (
              <div className="space-y-1.5 mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="pw-strength-bar flex-1"
                      style={{
                        backgroundColor: i <= pwStrength.level ? pwStrength.color : "var(--border)",
                        width: "100%",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Strength: <span style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                </p>
              </div>
            )}
          </div>
          <Button onClick={handleResetPassword}>Reset Password</Button>
        </CardContent>
      </Card>

      {/* ── SECTION 3: Notifications ───────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Control what emails you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow id="notif-analysis"  label="Analysis complete"     description="Get an email when your idea analysis finishes"         checked={notifs.email_analysis}    onCheckedChange={(v) => setNotifs({ ...notifs, email_analysis: v })} />
          <ToggleRow id="notif-cofounder" label="Co-founder messages"   description="Be notified when a founder sends you a message"        checked={notifs.cofounder_msg}     onCheckedChange={(v) => setNotifs({ ...notifs, cofounder_msg: v })} />
          <ToggleRow id="notif-platform"  label="Platform updates"      description="Product updates, new features, and announcements"      checked={notifs.platform_updates}  onCheckedChange={(v) => setNotifs({ ...notifs, platform_updates: v })} />
          <Button onClick={() => toast.success("Notification preferences saved")} className="mt-2">Save Preferences</Button>
        </CardContent>
      </Card>

      {/* ── SECTION 4: Co-Founder Network ──────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Co-Founder Network</CardTitle>
          </div>
          <CardDescription>Set up your profile to find co-founders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow id="discoverable" label="Make me discoverable" description="Other founders can find and message you"
            checked={coFounderForm.is_discoverable} onCheckedChange={(v) => setCoFounderForm({ ...coFounderForm, is_discoverable: v })} />
          {[
            { id: "bio",          label: "Bio",                        type: "textarea", placeholder: "A short intro about yourself…" },
            { id: "skills",       label: "Skills (comma-separated)",   type: "input",    placeholder: "React, Python, Marketing" },
            { id: "looking_for",  label: "Looking For",                type: "input",    placeholder: "A technical co-founder skilled in AI" },
            { id: "linkedin_url", label: "LinkedIn URL",               type: "input",    placeholder: "https://linkedin.com/in/…" },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              {type === "textarea" ? (
                <Textarea id={id} placeholder={placeholder} value={(coFounderForm as any)[id]}
                  onChange={(e) => setCoFounderForm({ ...coFounderForm, [id]: e.target.value })} rows={3} />
              ) : (
                <Input id={id} placeholder={placeholder} value={(coFounderForm as any)[id]}
                  onChange={(e) => setCoFounderForm({ ...coFounderForm, [id]: e.target.value })} />
              )}
            </div>
          ))}
          <Button onClick={handleSaveCoFounder} loading={savingCF}>Save Co-Founder Settings</Button>
        </CardContent>
      </Card>

      {/* ── SECTION 5: Danger Zone ─────────────────────────── */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Permanently delete your account and all associated data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This action is <strong>permanent</strong> and cannot be undone.
            All your ideas, analyses, and data will be lost.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">Type <strong>DELETE</strong> to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs"
            />
          </div>
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"}>
            Delete Account Permanently
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
