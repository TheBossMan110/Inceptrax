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
  Image as ImageIcon
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { StageTracker } from "@/components/stage-tracker"

const LAYER_DEFS = [
  { id: "problem",  label: "Problem",       color: "from-red-500 to-orange-500" },
  { id: "solution", label: "Solution",      color: "from-orange-500 to-amber-500" },
  { id: "audience", label: "Audience",      color: "from-amber-500 to-yellow-500" },
  { id: "market",   label: "Market",        color: "from-yellow-500 to-green-500" },
  { id: "monetize", label: "Monetization",  color: "from-green-500 to-emerald-500" },
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
  const timerRef = useRef<NodeJS.Timeout>()
  const audioContextRef = useRef<AudioContext>()
  const analyserRef = useRef<AnalyserNode>()
  const animationRef = useRef<number>()

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
      <div className="max-w-3xl mx-auto py-8 px-4">

        {filePreview && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium truncate max-w-xs">{filePreview.name}</p>
                  <p className="text-xs text-muted-foreground">{filePreview.type} • {filePreview.size}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFilePreview(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-none overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-white/70 to-primary/10 dark:from-card dark:to-primary/10">
          <CardContent className="p-6 sm:p-10 space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="title" className="text-sm font-bold uppercase text-muted-foreground">Startup Name / Working Title</Label>
                <span className="text-xs text-muted-foreground">{formData.title.length}/60</span>
              </div>
              <Input
                id="title"
                placeholder="e.g. AI Coffee Roaster"
                className="h-14 rounded-xl text-lg border-2"
                value={formData.title}
                onChange={handleInputChange}
                maxLength={60}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="description" className="text-sm font-bold uppercase text-muted-foreground">What's your idea?</Label>
                <span className="text-xs text-muted-foreground">{formData.description.length}/1000</span>
              </div>
              <Textarea
                id="description"
                placeholder="Describe what you want to build..."
                className="min-h-[140px] rounded-xl text-lg border-2 resize-none"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={1000}
              />
            </div>

            <div className="space-y-6 pt-4">
              <Button
                onClick={initiateLayersEngine}
                disabled={isLoading || (!formData.title && !formData.description)}
                className="w-full rounded-xl h-14 font-semibold text-lg bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.02] transition-transform text-white shadow-xl"
              >
                {isLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Initializing...</>
                ) : (
                  <>Start Interactive Refinement <Layers className="h-5 w-5 ml-2" /></>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or provide more context via</span>
                </div>
              </div>

              {/* Input Methods - Inside the card */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? "destructive" : "secondary"}
                  className="rounded-xl h-11 gap-2 shadow-sm relative overflow-hidden flex-1 min-w-[140px]"
                  disabled={isUploading}
                >
                  {isRecording ? (
                    <>
                      <StopCircle className="h-4 w-4 animate-pulse" />
                      <span>{formatTime(recordingTime)}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" /> Voice Input
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
                      "flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer shadow-sm font-medium transition-colors w-full",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload File/PPT/PDF
                  </Label>
                </div>
                
                {(formData.title || formData.description) && (
                  <Button variant="outline" onClick={handleClearDraft} className="rounded-xl h-11 gap-2 flex-1 min-w-[140px]">
                    <X className="h-4 w-4" /> Clear Draft
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            <p className="text-sm text-muted-foreground">Submitting your idea…</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md shrink-0">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate">Refining Your Idea</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{formData.title || "Startup Concept"}</p>
          </div>
        </div>
        {isReady && (
          <Button
            onClick={handleFinalize}
            disabled={isLoading}
            className="rounded-xl gap-2 font-semibold bg-gradient-to-r from-green-600 to-emerald-600 sm:hover:scale-105 text-white shadow-lg transition-transform sm:animate-bounce w-full sm:w-auto"
          >
            <Rocket className="h-4 w-4" /> Start Final Analysis
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {LAYER_DEFS.map((l) => {
          const isCompleted = completedLayers.includes(l.id)
          const isActive = activeLayer === l.id
          return (
            <div key={l.id} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-2 w-full rounded-full transition-all duration-500",
                  isCompleted ? `bg-gradient-to-r ${l.color}` : isActive ? `bg-gradient-to-r ${l.color} opacity-50 animate-pulse` : "bg-muted"
                )}
              />
              <div className="flex items-center gap-1">
                {isCompleted ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : isActive ? <Circle className="h-3 w-3 text-primary animate-pulse" /> : <Circle className="h-3 w-3 text-muted-foreground/40" />}
                <span className={cn("text-[9px] sm:text-[10px] font-medium uppercase tracking-wider hidden xs:inline", isCompleted ? "text-green-600" : isActive ? "text-primary font-bold" : "text-muted-foreground/60")}>
                  {l.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Progress value={progress} className="flex-1 h-1.5" />
        <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex items-start gap-2.5 max-w-[80%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", msg.role === "user" ? "bg-primary text-white" : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300")}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div>
                {msg.role === "ai" && msg.layerLabel && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1 block">{msg.layerLabel} Layer</span>
                )}
                <div className={cn("px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm", msg.role === "user" ? "bg-primary text-white rounded-tr-none" : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-none")}>
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isReady && !isLoading && (
          <div className="flex flex-col items-center py-8 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-foreground">Refinement Complete!</h3>
              <p className="text-sm text-muted-foreground">I have everything needed for a deep analysis.</p>
            </div>
            <Button
              onClick={handleFinalize}
              className="rounded-xl px-8 h-12 gap-2 font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 text-white shadow-xl transition-transform"
            >
              <Rocket className="h-5 w-5" /> Start Final Analysis
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex items-start gap-2.5 max-w-[80%]">
              <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 shadow-sm"><Bot className="h-4 w-4" /></div>
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span className="animate-pulse">Thinking...</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder={isReady ? "Refinement complete" : "Type your answer..."}
          className="h-12 rounded-xl text-base border-2 focus:border-primary transition-all"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendAnswer()}
          disabled={isLoading || isReady}
          autoFocus
        />
        <Button onClick={handleSendAnswer} disabled={isLoading || !input.trim() || isReady} size="icon" className="h-12 w-12 rounded-xl shrink-0 bg-primary shadow-md">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}