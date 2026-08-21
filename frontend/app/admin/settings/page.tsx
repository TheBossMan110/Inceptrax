"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Download, UploadCloud, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AdminSettingsPage() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDownloadBackup = async () => {
    setIsDownloading(true)
    try {
      const blob = await apiFetch("/admin/backup")
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
      a.download = `inceptrax_backup_${date}.db`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Database backup downloaded successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to download backup")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (!file.name.endsWith('.db')) {
        toast.error("Please select a valid SQLite .db file")
        setSelectedFile(null)
        e.target.value = ''
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRestoreDatabase = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to restore")
      return
    }

    setIsRestoring(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      await apiFetch('/admin/restore', {
        method: 'POST',
        body: formData
      })

      toast.success("Database restored successfully! Refreshing...")

      // Reload page to force refetch of any cached data
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      toast.error(error.message || "An error occurred during restore")
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-up">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your core platform configuration and database backups.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup */}
        <div className="card-premium rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand/25 to-brand-violet/15 border border-brand/20 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-brand-cyan" />
            </div>
            <h3 className="text-base font-semibold tracking-tight">Database Backup</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Download a full local copy of the current production SQLite database (`.db` format).
          </p>
          <Button
              onClick={handleDownloadBackup}
              className="w-full sm:w-auto rounded-xl gap-2 font-semibold bg-primary hover:bg-primary/90 glow-primary shimmer press"
              disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? "Generating Backup..." : "Download Backup"}
          </Button>
        </div>

        {/* Restore — destructive zone */}
        <div className="rounded-2xl border border-danger/25 bg-danger/[0.06] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center shrink-0">
              <UploadCloud className="h-5 w-5 text-danger" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-danger">Database Restore</h3>
          </div>
          <p className="text-sm text-danger/80 leading-relaxed mb-6">
            Upload a valid `.db` file to completely overwrite and restore the platform database.
          </p>
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-mono uppercase tracking-wider text-danger/90 font-medium">
                Select Backup File
              </label>
              <input
                type="file"
                accept=".db"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-danger/10 file:text-danger
                  hover:file:bg-danger/20
                  transition-all cursor-pointer"
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="w-full sm:w-auto rounded-xl gap-2 font-semibold press"
                    disabled={!selectedFile || isRestoring}
                >
                  {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  {isRestoring ? "Restoring Database..." : "Restore Database"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border border-danger/25 rounded-2xl shadow-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-danger flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Danger: Data Overwrite
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-foreground/80 mt-2">
                    This action will <strong className="text-danger font-bold">PERMANENTLY overwrite</strong> the current database. All new users, ideas, and data collected since this backup was made will be completely erased.
                    <br/><br/>
                    Are you absolutely sure you want to proceed with restore?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel className="rounded-xl font-medium border-white/10 bg-white/[0.03] hover:bg-white/[0.07]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRestoreDatabase}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold press"
                  >
                    Yes, overwrite database
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  )
}
