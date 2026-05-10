"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="text-muted-foreground">Manage your core platform configuration and database backups.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" /> Database Backup
            </CardTitle>
            <CardDescription>
              Download a full local copy of the current production SQLite database (`.db` format).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
                onClick={handleDownloadBackup} 
                className="w-full sm:w-auto rounded-xl gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloading ? "Generating Backup..." : "Download Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 border shadow-sm bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UploadCloud className="h-5 w-5" /> Database Restore
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Upload a valid `.db` file to completely overwrite and restore the platform database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-destructive">Select Backup File</label>
              <input 
                type="file" 
                accept=".db" 
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-destructive/10 file:text-destructive
                  hover:file:bg-destructive/20
                  transition-all cursor-pointer"
              />
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                    variant="destructive" 
                    className="w-full sm:w-auto rounded-xl gap-2 font-semibold shadow-md transition-all" 
                    disabled={!selectedFile || isRestoring}
                >
                  {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  {isRestoring ? "Restoring Database..." : "Restore Database"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background border border-destructive/20 rounded-2xl shadow-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Danger: Data Overwrite
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-foreground/80 mt-2">
                    This action will <strong className="text-destructive font-bold">PERMANENTLY overwrite</strong> the current database. All new users, ideas, and data collected since this backup was made will be completely erased.
                    <br/><br/>
                    Are you absolutely sure you want to proceed with restore?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel className="rounded-xl font-medium border-border hover:bg-muted">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleRestoreDatabase}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold shadow-sm"
                  >
                    Yes, overwrite database
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
