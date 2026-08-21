"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Sparkles,
  Send,
  Layers,
  ArrowRight,
  User,
  Bot,
  CheckCircle2,
  Circle,
  Rocket,
  Mic,
  Upload,
  X,
  StopCircle,
  FileText,
  PenLine,
  Image as ImageIcon
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { StageTracker } from "@/components/stage-tracker"

/** Purely presentational: shows where the founder is in the three-step flow. */
const SEED_STEPS = [
  { icon: PenLine, label: "Describe" },
  { icon: Layers, label: "Refine" },
  { icon: Rocket, label: "Analyze" },
]

const LAYER_DEFS = [
  { id: "problem",  label: "Problem",       color: "from-brand-fuchsia to-brand-violet" },
  { id: "solution", label: "Solution",      color: "from-brand-violet to-brand" },
  { id: "audience", label: "Audience",      color: "from-brand to-brand-cyan" },
  { id: "market",   label: "Market",        color: "from-brand-cyan to-brand" },
  { id: "monetize", label: "Monetization",  color: "from-brand to-brand-violet" },
]

interface Message {
  role: "ai" | "user"
  content: string
  layer?: string
  layerLabel?: string
}

type Phase = "seed" | "chatting" | "finalizing" | "done"

export default function NewIdeaPage() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  // ─────────────────────────────────────────────────────────────────────────────
  // State: Core Flow
  // ─────────────────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("seed")
  const [initialIdea, setInitialIdea] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [completedLayers, setCompletedLayers] = useState<string[]>([])
  const [isReady, setIsReady] = useState(false)

  // Stage tracker state (must be before any early returns — Rules of Hooks)
  const [analysisIdeaId, setAnalysisIdeaId] = useState<number | null>(null)
  const [analysisScore, setAnalysisScore] = useState(0)

  // ─────────────────────────────────────────────────────────────────────────────
  // State: Seed Form
  // ─────────────────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ title: "", description: "" })
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const audioContextRef = useRef<AudioContext | undefined>(undefined)
  const analyserRef = useRef<AnalyserNode | undefined>(undefined)
  const animationRef = useRef<number | undefined>(undefined)

  const [filePreview, setFilePreview] = useState<{
    name: string;
    type: string;
    size: string;
  } | null>(null)

  // Auto-save draft
  useEffect(() => {
    if (phase === "seed") {
      const autoSave = () => {
        if (formData.title || formData.description) {
          localStorage.setItem('ideaDraft', JSON.stringify(formData))
        }
      }
      const interval = setInterval(autoSave, 10000)
      return () => clearInterval(interval)
    }
  }, [formData, phase])

  // Load draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('ideaDraft')
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft))
      toast.info('Loaded saved draft')
    }
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // ─────────────────────────────────────────────────────────────────────────────
  // Seed Phase Methods
  // ─────────────────────────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleClearDraft = () => {
    setFormData({ title: "", description: "" })
    localStorage.removeItem('ideaDraft')
    setFilePreview(null)
    toast.success("Draft cleared")
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          setAudioChunks(prev => [...prev, e.data])
        }
      }
      
      mediaRecorder.onstop = async () => {
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: "audio/webm" })
          handleVoiceUpload(blob)
        }
        stream.getTracks().forEach(track => track.stop())
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
      visualizeAudio()
    } catch (err) {
      toast.error("Microphone access denied or unavailable")
    }
  }

  const visualizeAudio = () => {
    if (!analyserRef.current) return
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount)
      analyserRef.current!.getByteFrequencyData(dataArray)
    }
    draw()
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleVoiceUpload = async (audioBlob: Blob) => {
    setIsUploading(true)
    const fd = new FormData()
    fd.append("file", audioBlob, "recording.webm")

    try {
      const response = await apiFetch("/ideas/upload/voice", {
        method: "POST",
        body: fd,
      })
      const { title, description } = response.data
      setFormData(prev => ({ 
        title: prev.title || title || "", 
        description: prev.description ? `${prev.description}\n\n${description || ""}`.trim() : description || "" 
      }))
      setAudioChunks([])
      toast.success("Voice transcribed successfully!")
    } catch (error: any) {
      toast.error("Failed to process voice: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    const maxSize = 10 * 1024 * 1024

    if (!validTypes.includes(file.type) && !file.name.endsWith('.ppt') && !file.name.endsWith('.pptx')) {
      toast.error("Please upload PDF, Image, PPT, or Text files only")
      return
    }

    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB")
      return
    }

    setFilePreview({
      name: file.name,
      type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    })

    setIsUploading(true)
    const fd = new FormData()
    fd.append("file", file)

    try {
      const response = await apiFetch("/ideas/upload/file", {
        method: "POST",
        body: fd,
      })
      const { title, description } = response.data
      setFormData(prev => ({ 
        title: prev.title || title || "", 
        description: prev.description ? `${prev.description}\n\n${description || ""}`.trim() : description || "" 
      }))
      toast.success("Text extracted from file!")
    } catch (error: any) {
      toast.error("Failed to process file: " + error.message)
      setFilePreview(null)
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Layers Engine Logic
  // ─────────────────────────────────────────────────────────────────────────────
  const initiateLayersEngine = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error("Please provide a title or description first")
      return
    }

    setIsLoading(true)
    const combinedIdea = `Title: ${formData.title}\nDescription: ${formData.description}`.trim()
    setInitialIdea(combinedIdea)

    try {
      const res = await apiFetch("/ideas/layers/start", {
        method: "POST",
        body: JSON.stringify({ initial_idea: combinedIdea }),
      })

      localStorage.removeItem('ideaDraft')

      const { question, layer, layer_label, progress_pct } = res.data

      setMessages([
        {
          role: "ai",
          content: `Great start. To make this analysis truly powerful, let's refine this layer by layer. First question:`,
          layer,
          layerLabel: layer_label,
        },
        { role: "ai", content: question, layer, layerLabel: layer_label },
      ])
      setHistory([question])
      setActiveLayer(layer)
      setProgress(progress_pct || 10)
      setPhase("chatting")
    } catch (err: any) {
      toast.error(err.message || "Failed to start AI Layers Engine")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendAnswer = async () => {
    if (!input.trim()) return

    const userAnswer = input.trim()
    setMessages(prev => [...prev, { role: "user", content: userAnswer }])
    setInput("")
    setIsLoading(true)

    const newHistory = [...history, userAnswer]
    setHistory(newHistory)

    if (activeLayer && !completedLayers.includes(activeLayer)) {
      setCompletedLayers(prev => [...prev, activeLayer])
    }

    try {
      const res = await apiFetch("/ideas/layers/chat", {
        method: "POST",
        body: JSON.stringify({ initial_idea: initialIdea, history: newHistory }),
      })

      const { question, layer, layer_label, progress_pct, is_ready } = res.data

      setHistory(prev => [...prev, question])
      setMessages(prev => [ ...prev, { role: "ai", content: question, layer, layerLabel: layer_label } ])
      setActiveLayer(layer)
      setProgress(Math.min(progress_pct || progress + 20, 100))

      if (is_ready) setIsReady(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to get next question")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalize = async () => {
    setPhase("finalizing")
    setIsLoading(true)

    try {
      const res = await apiFetch("/ideas/layers/finalize", {
        method: "POST",
        body: JSON.stringify({ initial_idea: initialIdea, history }),
      })

      const ideaId = res.data.idea.id
      setAnalysisIdeaId(ideaId)
      toast.success("Analysis started! Tracking progress…")
      // Don't redirect here — the polling useEffect handles it on completion
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize idea")
      setPhase("chatting")
    } finally {
      setIsLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Seed Phase
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === "seed") {
    return (
      <div className="relative max-w-3xl mx-auto py-8 sm:py-12 px-4 animate-fade-up">
        {/* Soft overhead light */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-16 h-64 w-[560px] max-w-[120%] rounded-full bg-brand/[0.13] blur-[110px]"
        />

        <header className="relative text-center mb-9 sm:mb-11">
          <p className="eyebrow mb-4">New idea</p>
          <h1 className="text-[1.875rem] sm:text-[2.75rem] font-semibold tracking-[-0.035em] leading-[1.08] text-gradient-subtle">
            Describe your <span className="accent-serif text-gradient">idea</span>
          </h1>
          <p className="text-[15px] text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
            Our AI refines it layer by layer, then runs a full 8-stage analysis.
          </p>

          {/* Three-step orientation */}
          <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
            {SEED_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-7 w-7 rounded-lg border flex items-center justify-center shrink-0",
                      i === 0
                        ? "bg-brand/15 border-brand/30 text-brand-cyan shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12)]"
                        : "bg-white/[0.03] border-white/[0.07] text-muted-foreground/45"
                    )}
                  >
                    <step.icon className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-medium uppercase tracking-[0.18em] whitespace-nowrap",
                      i === 0 ? "text-foreground inline" : "text-muted-foreground/45 hidden sm:inline"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < SEED_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="h-px w-5 sm:w-10 bg-gradient-to-r from-white/[0.16] to-white/[0.04]"
                  />
                )}
              </div>
            ))}
          </div>
        </header>

        {filePreview && (
          <Card className="relative card-premium rounded-2xl border-none shadow-none mb-5 animate-fade-in">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.09)]">
                  <FileText className="h-5 w-5 text-brand-cyan" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{filePreview.name}</p>
                  <p className="text-xs font-mono text-muted-foreground/70 mt-0.5">{filePreview.type} · {filePreview.size}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]" onClick={() => setFilePreview(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="relative rounded-2xl border-gradient shadow-[0_40px_100px_-40px_oklch(0.585_0.222_277/0.45)]">
          <div className="relative rounded-2xl p-6 sm:p-10 space-y-8 bg-[linear-gradient(to_bottom,oklch(1_0_0_/_0.045),transparent_38%)]">
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <Label htmlFor="title" className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/70">Startup Name / Working Title</Label>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground/50">{formData.title.length}/60</span>
              </div>
              <Input
                id="title"
                placeholder="e.g. AI Coffee Roaster"
                className="h-14 rounded-xl text-lg bg-white/[0.03] border-white/10 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] focus-visible:border-brand/40 transition-colors"
                value={formData.title}
                onChange={handleInputChange}
                maxLength={60}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <Label htmlFor="description" className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/70">What&apos;s your idea?</Label>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground/50">{formData.description.length}/1000</span>
              </div>
              <Textarea
                id="description"
                placeholder="Describe what you want to build — the problem, who it's for, and why now. A few sentences is plenty."
                className="min-h-[180px] rounded-xl text-lg leading-relaxed bg-white/[0.03] border-white/10 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] focus-visible:border-brand/40 transition-colors resize-none"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={1000}
              />
            </div>

            <div className="space-y-6 pt-2">
              <Button
                onClick={initiateLayersEngine}
                disabled={isLoading || (!formData.title && !formData.description)}
                className="w-full rounded-xl h-14 font-semibold text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shimmer press disabled:opacity-45"
              >
                {isLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Initializing...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Start Interactive Refinement</>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full divider-glow" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Or provide more context via</span>
                </div>
              </div>

              {/* Input Methods - Inside the card */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "outline"}
                  className={cn(
                    "rounded-xl h-11 gap-2 relative overflow-hidden flex-1 min-w-[140px] press",
                    !isRecording && "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  )}
                  disabled={isUploading}
                >
                  {isRecording ? (
                    <>
                      <StopCircle className="h-4 w-4 animate-pulse" />
                      <span className="font-mono tabular-nums">{formatTime(recordingTime)}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-brand-cyan" /> Voice Input
                    </>
                  )}
                </Button>

                <div className="relative flex-1 min-w-[140px]">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.ppt,.pptx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Label
                    htmlFor="file-upload"
                    className={cn(
                      "flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-foreground cursor-pointer text-sm font-medium transition-colors w-full press",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-brand-cyan" />}
                    Upload File/PPT/PDF
                  </Label>
                </div>

                {(formData.title || formData.description) && (
                  <Button variant="ghost" onClick={handleClearDraft} className="rounded-xl h-11 gap-2 flex-1 min-w-[140px] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]">
                    <X className="h-4 w-4" /> Clear Draft
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Finalizing / Done — Live Stage Tracker
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "finalizing" || phase === "done") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        {analysisIdeaId ? (
          <StageTracker
            ideaId={analysisIdeaId}
            onComplete={(score) => {
              setAnalysisScore(score)
              setPhase("done")
              setTimeout(() => {
                router.push(`/dashboard/idea/${analysisIdeaId}/validation`)
              }, 2500)
            }}
          />
        ) : (
          <div className="relative rounded-2xl border-gradient shadow-[0_30px_80px_-40px_oklch(0.585_0.222_277/0.4)]">
            <div className="glass-strong rounded-2xl flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]">
                <Loader2 className="h-5 w-5 animate-spin text-brand-cyan" />
              </div>
              <p className="text-sm text-muted-foreground">Submitting your idea…</p>
              <div className="w-40 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-cyan via-brand to-brand-violet animate-beam" />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Chatting Phase
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-80px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand to-brand-violet flex items-center justify-center shadow-[0_10px_28px_-8px_oklch(0.585_0.222_277/0.7),inset_0_1px_0_oklch(1_0_0_/_0.2)] shrink-0">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-brand-cyan mb-1">Step 2 · Refine</p>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
              {formData.title || "Startup Concept"}
            </h1>
          </div>
        </div>
        {isReady && (
          <Button
            onClick={handleFinalize}
            disabled={isLoading}
            className="rounded-xl gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shimmer press w-full sm:w-auto"
          >
            <Rocket className="h-4 w-4" /> Start Final Analysis
          </Button>
        )}
      </div>

      <div className="card-premium rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex items-center gap-1.5">
          {LAYER_DEFS.map((l) => {
            const isCompleted = completedLayers.includes(l.id)
            const isActive = activeLayer === l.id
            return (
              <div key={l.id} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "h-1.5 w-full rounded-full transition-all duration-500",
                    isCompleted ? `bg-gradient-to-r ${l.color}` : isActive ? `bg-gradient-to-r ${l.color} opacity-50 animate-pulse` : "bg-white/[0.06]"
                  )}
                />
                <div className="flex items-center gap-1">
                  {isCompleted ? <CheckCircle2 className="h-3 w-3 text-success" /> : isActive ? <Circle className="h-3 w-3 text-brand animate-pulse" /> : <Circle className="h-3 w-3 text-muted-foreground/40" />}
                  <span className={cn("text-[9px] sm:text-[10px] font-mono font-medium uppercase tracking-[0.12em] hidden xs:inline", isCompleted ? "text-success" : isActive ? "text-brand-cyan font-semibold" : "text-muted-foreground/60")}>
                    {l.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
          <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-muted-foreground/60 shrink-0 hidden sm:inline">
            Progress
          </span>
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-sm font-semibold tabular-nums tracking-tight text-brand-cyan shrink-0">{Math.round(progress)}%</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex items-start gap-2.5 max-w-[80%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12)]", msg.role === "user" ? "bg-gradient-to-br from-brand to-brand-violet text-white" : "bg-white/[0.06] border border-white/[0.08] text-brand-cyan")}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div>
                {msg.role === "ai" && msg.layerLabel && (
                  <span className="text-[10px] font-mono font-medium uppercase tracking-[0.18em] text-brand-cyan mb-1.5 block">{msg.layerLabel} Layer</span>
                )}
                <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed text-foreground shadow-[inset_0_1px_0_oklch(1_0_0_/_0.05),0_8px_24px_-16px_oklch(0_0_0_/_0.8)]", msg.role === "user" ? "bg-brand/15 border border-brand/25 rounded-tr-md" : "bg-white/[0.045] border border-white/[0.07] rounded-tl-md")}>
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isReady && !isLoading && (
          <div className="flex flex-col items-center py-8 space-y-4 animate-fade-up">
            <div className="h-12 w-12 rounded-full bg-success/10 border border-success/25 flex items-center justify-center text-success shadow-[0_0_24px_oklch(0.72_0.17_160/0.3)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg tracking-tight text-foreground">Refinement Complete!</h3>
              <p className="text-sm text-muted-foreground">I have everything needed for a deep analysis.</p>
            </div>
            <Button
              onClick={handleFinalize}
              className="rounded-xl px-8 h-12 gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground glow-primary shimmer press"
            >
              <Rocket className="h-5 w-5" /> Start Final Analysis
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex items-start gap-2.5 max-w-[80%]">
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-white/[0.06] border border-white/[0.08] text-brand-cyan"><Bot className="h-4 w-4" /></div>
              <div className="bg-white/[0.04] border border-white/[0.06] px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin text-brand" /><span className="animate-pulse">Thinking...</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center rounded-2xl glass-strong p-2 shadow-[0_20px_50px_-30px_oklch(0_0_0_/_0.9)]">
        <Input
          placeholder={isReady ? "Refinement complete" : "Type your answer..."}
          className="h-12 rounded-xl text-base bg-white/[0.03] border-white/[0.07] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] focus-visible:border-brand/40 transition-colors"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendAnswer()}
          disabled={isLoading || isReady}
          autoFocus
        />
        <Button onClick={handleSendAnswer} disabled={isLoading || !input.trim() || isReady} size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary hover:bg-primary/90 glow-primary press disabled:opacity-45">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}