import { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicIdeaView } from "@/components/public-idea-view"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

async function fetchPublicIdea(token: string) {
    try {
        const res = await fetch(`${API_URL}/ideas/shared/${token}`, {
            cache: "no-store",
        })
        if (!res.ok) return null
        const json = await res.json()
        return json?.data?.idea ?? null
    } catch {
        return null
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ token: string }>
}): Promise<Metadata> {
    const { token } = await params
    const idea = await fetchPublicIdea(token)
    if (!idea) {
        return { title: "Idea Not Found — Inceptrax" }
    }
    return {
        title: `${idea.title} — Shared Report`,
        description: idea.description?.slice(0, 155),
    }
}

export default async function PublicSharePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const idea = await fetchPublicIdea(token)

    if (!idea) {
        notFound()
    }

    return <PublicIdeaView idea={idea} />
}
