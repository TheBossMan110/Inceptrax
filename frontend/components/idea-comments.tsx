"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send, User } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Comment {
  id: number
  content: string
  author_name: string
  created_at: string
}

interface IdeaCommentsProps {
  shareToken: string
}

export function IdeaComments({ shareToken }: IdeaCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchComments() {
      try {
        const response = await apiFetch(`/ideas/shared/${shareToken}/comments`)
        setComments(response.data.comments)
      } catch (error) {
        console.error("Failed to fetch comments:", error)
      } finally {
        setIsLoading(false)
      }
    }
    if (shareToken) fetchComments()
  }, [shareToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await apiFetch(`/ideas/shared/${shareToken}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content: newComment,
          author_name: authorName || "Anonymous"
        })
      })
      
      setComments([...comments, response.data.comment])
      setNewComment("")
      // Keep author name for next comment
    } catch (error) {
      console.error("Failed to post comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-none shadow-sm bg-card/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MessageSquare className="h-5 w-5 text-primary" />
          Community Feedback ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 p-4 rounded-2xl border border-border">
          <div className="flex gap-4 items-start">
            <Avatar className="h-10 w-10 border mt-1">
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow space-y-3">
              <Input 
                placeholder="Your name (optional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="bg-background border-border rounded-xl"
              />
              <Textarea
                placeholder="Share your thoughts or suggest an improvement..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-background border-border min-h-[100px] rounded-xl resize-none"
              />
              <div className="flex justify-end">
                <Button 
                    type="submit" 
                    disabled={isSubmitting || !newComment.trim()}
                    className="rounded-xl gap-2 font-semibold"
                >
                  {isSubmitting ? "Posting..." : "Post Comment"}
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading comments...</div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4 group">
                <Avatar className="h-10 w-10 border shrink-0">
                  <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                    {comment.author_name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-grow space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{comment.author_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-2xl border border-border/50 group-hover:border-primary/20 transition-colors">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed rounded-3xl border-border bg-muted/10">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No comments yet. Be the first to share your feedback!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
