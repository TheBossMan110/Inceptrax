"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Check, Presentation, Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ideaId: number
  ideaTitle: string
}

const SECTIONS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "market_analysis", label: "Market Analysis" },
  { key: "competitor_analysis", label: "Competitor Analysis" },
  { key: "financial_projections", label: "Financial Projections" },
  { key: "business_model", label: "Business Model" },
  { key: "risk_assessment", label: "Risk Assessment" },
  { key: "investor_pitch", label: "Investor Pitch" },
]

const COLOR_THEMES = [
  { key: "midnight_black", label: "Midnight Black", preview: { bg: "#0A0A14", accent: "#6366F1", text: "#F1F5F9" } },
  { key: "pure_white", label: "Pure White", preview: { bg: "#FFFFFF", accent: "#1F2937", text: "#0F172A" } },
  { key: "charcoal_gray", label: "Charcoal Gray", preview: { bg: "#1F2937", accent: "#9CA3AF", text: "#F9FAFB" } },
  { key: "navy_white", label: "Navy & White", preview: { bg: "#0F172A", accent: "#3B82F6", text: "#F1F5F9" } },
  { key: "forest_green", label: "Forest Green", preview: { bg: "#064E3B", accent: "#10B981", text: "#ECFDF5" } },
]

const FONTS = ["Inter", "Georgia", "Playfair Display", "Roboto", "Montserrat"]

const LAYOUTS = [
  { key: "minimal", label: "Minimal" },
  { key: "bold", label: "Bold" },
  { key: "corporate", label: "Corporate" },
  { key: "creative", label: "Creative" },
]

export function ExportModal({ open, onOpenChange, ideaId, ideaTitle }: ExportModalProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(SECTIONS.map(s => s.key))
  const [selectedTheme, setSelectedTheme] = useState("midnight_black")
  const [selectedFont, setSelectedFont] = useState("Inter")
  const [selectedLayout, setSelectedLayout] = useState("minimal")
  const [includeCharts, setIncludeCharts] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const toggleSection = (key: string) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    )
  }

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      toast.error("Select at least one section")
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/ideas/${ideaId}/export/ppt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            theme: selectedTheme,
            sections: selectedSections,
            font: selectedFont,
            layout: selectedLayout,
            include_charts: includeCharts,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Export failed")
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${ideaTitle.replace(/\s+/g, "-")}-InvestorDeck.pptx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Your presentation is ready!")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to generate presentation")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Presentation className="h-5 w-5 text-primary" />
              Export Presentation
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Customize your investor deck — sections, theme, font, and layout.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Section Checkboxes */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Include Sections</h4>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(section => (
                <label
                  key={section.key}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                    selectedSections.includes(section.key)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.key)}
                    onChange={() => toggleSection(section.key)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="font-medium">{section.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setSelectedSections(SECTIONS.map(s => s.key))} className="text-xs text-primary hover:underline">Select all</button>
              <span className="text-xs text-muted-foreground">·</span>
              <button type="button" onClick={() => setSelectedSections([])} className="text-xs text-muted-foreground hover:underline">Clear all</button>
            </div>
          </div>

          {/* Color Theme */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Color Theme</h4>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_THEMES.map(theme => {
                const selected = selectedTheme === theme.key
                return (
                  <button
                    key={theme.key}
                    onClick={() => setSelectedTheme(theme.key)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all",
                      selected ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div
                      className="w-full h-8 rounded-md flex items-center justify-center"
                      style={{ background: theme.preview.bg, border: `1px solid ${theme.preview.accent}44` }}
                    >
                      <div className="h-1.5 w-6 rounded-sm" style={{ background: theme.preview.accent }} />
                    </div>
                    <span className="text-[10px] font-medium leading-tight text-center">{theme.label}</span>
                    {selected && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Font + Layout row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Font</h4>
              <select
                value={selectedFont}
                onChange={e => setSelectedFont(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {FONTS.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Slide Layout</h4>
              <select
                value={selectedLayout}
                onChange={e => setSelectedLayout(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LAYOUTS.map(layout => (
                  <option key={layout.key} value={layout.key}>{layout.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Include Charts Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-semibold">Include Charts / Visuals</p>
              <p className="text-xs text-muted-foreground">Add visual data representations to slides</p>
            </div>
            <button
              type="button"
              onClick={() => setIncludeCharts(!includeCharts)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                includeCharts ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                includeCharts ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {selectedSections.length} sections · {COLOR_THEMES.find(t => t.key === selectedTheme)?.label}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedSections.length === 0 || isGenerating}
              onClick={handleGenerate}
              className="gap-2 min-w-[11rem]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building your deck…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate Presentation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
