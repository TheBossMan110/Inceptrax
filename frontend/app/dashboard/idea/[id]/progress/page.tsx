"use client"

import { useParams, useRouter } from "next/navigation"
import { StageTracker } from "@/components/stage-tracker"

export default function IdeaProgressPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = Number(params.id)

  if (!ideaId || isNaN(ideaId)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Invalid idea ID</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <StageTracker
        ideaId={ideaId}
        onComplete={(score) => {
          setTimeout(() => {
            router.push(`/dashboard/idea/${ideaId}/validation`)
          }, 2500)
        }}
      />
    </div>
  )
}
