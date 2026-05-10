"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, Download } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PdfExportModalProps {
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

const FONTS = [
  { key: "Helvetica", label: "Inter (Default)" },
  { key: "Times-Roman", label: "Georgia" },
  { key: "Helvetica", label: "Playfair Display" },
  { key: "Helvetica", label: "Roboto" },
  { key: "Helvetica-Bold", label: "Montserrat" },
]

export function PdfExportModal({ open, onOpenChange, ideaId, ideaTitle }: PdfExportModalProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(
    SECTIONS.map(s => s.key) // all selected by default
  )
  const [selectedFont, setSelectedFont] = useState("Helvetica")
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
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/ideas/${ideaId}/export/pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sections: selectedSections, font: selectedFont }),
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
      a.download = `${ideaTitle.replace(/\s+/g, "-")}-Analysis.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Your PDF report is ready!")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Export PDF Report
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose which sections to include and select a font style.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section Checkboxes */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Include Sections</h4>
            <div className="space-y-2">
              {SECTIONS.map(section => (
                <label
                  key={section.key}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
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
                  <span className="text-sm font-medium">{section.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setSelectedSections(SECTIONS.map(s => s.key))}
                className="text-xs text-primary hover:underline"
              >
                Select all
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => setSelectedSections([])}
                className="text-xs text-muted-foreground hover:underline"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Font Selector */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Font Style</h4>
            <select
              value={selectedFont}
              onChange={e => setSelectedFont(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {FONTS.map(font => (
                <option key={font.label} value={font.key}>{font.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {selectedSections.length} of {SECTIONS.length} sections selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedSections.length === 0 || isGenerating}
              onClick={handleGenerate}
              className="gap-2 min-w-[10rem]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
