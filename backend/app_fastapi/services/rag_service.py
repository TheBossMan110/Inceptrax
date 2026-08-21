"""
RAG layer — "Ask anything about my startup" (Phase 2 spec §7)

Embeds everything Inceptrax knows about an idea — the idea itself, each of the
eight stage results, agent digests, and pivot suggestions — so the founder can
ask questions in plain language and get answers grounded in their own data.

Two decisions worth explaining:

1. **Gemini embeddings, not Voyage.** The spec §7.4 preferred Voyage, but this
   deployment has no Voyage key and adding a vendor for one feature is not
   worth it. `gemini-embedding-001` at 768 dimensions is served by the key
   already in use, costs nothing extra to operate, and is more than adequate
   at this corpus size.

2. **Vector search with a brute-force fallback.** Atlas `$vectorSearch` needs an
   index created through the Atlas UI, which cannot be done from application
   code. Rather than have the feature simply not work until someone clicks
   through a dashboard, retrieval falls back to in-memory cosine similarity.
   At a few thousand chunks that is genuinely fast, and the code upgrades to
   the real index automatically once it exists.

SECURITY (spec §7.6, §12.4): every retrieval is filtered by BOTH user_id and
idea_id, and the user_id always comes from the authenticated session — never
from the request body. A vector search without that filter returns other
people's data, which is the single worst bug this feature could have.
"""

import logging
import math
from datetime import datetime

logger = logging.getLogger(__name__)

EMBED_MODEL = "models/gemini-embedding-001"
EMBED_DIMS = 768
VECTOR_INDEX = "idea_context_idx"
CHUNK_CHARS = 1800          # ~450 tokens; keeps each chunk answerable on its own
MAX_CHUNKS_PER_SOURCE = 6
DEFAULT_K = 5


class RAGService:

    # ── Embedding ─────────────────────────────────────────────────────────

    @staticmethod
    def embed(text: str, is_query: bool = False) -> list[float] | None:
        """
        Embed one piece of text.

        Documents and queries use different task types — Gemini embeds them
        into the same space but optimises each side, which measurably improves
        retrieval over using one type for both.
        """
        import os
        import google.generativeai as genai

        text = (text or "").strip()
        if not text:
            return None

        try:
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            result = genai.embed_content(
                model=EMBED_MODEL,
                content=text[:8000],
                task_type="retrieval_query" if is_query else "retrieval_document",
                output_dimensionality=EMBED_DIMS,
            )
            return result["embedding"]
        except Exception as e:
            logger.warning("[RAG] embedding failed: %s", e)
            return None

    # ── Indexing ──────────────────────────────────────────────────────────

    @staticmethod
    def index_idea(idea_id: int) -> dict:
        """
        (Re)build the searchable context for one idea.

        Idempotent: existing chunks for the idea are replaced, so this can be
        re-run after new analysis stages or agent findings without duplicating.
        """
        from app import get_db

        db = get_db()
        idea = db.ideas.find_one({"id": idea_id})
        if not idea:
            return {"error": "idea not found", "chunks": 0}

        user_id = idea.get("user_id")
        sources = RAGService._collect_sources(db, idea)

        db.idea_context.delete_many({"idea_id": idea_id})

        stored = 0
        for source_type, title, text in sources:
            for chunk in RAGService._chunk(text)[:MAX_CHUNKS_PER_SOURCE]:
                vector = RAGService.embed(chunk)
                if not vector:
                    continue
                db.idea_context.insert_one({
                    "idea_id": idea_id,
                    "user_id": user_id,          # the security filter
                    "source_type": source_type,
                    "title": title,
                    "content": chunk,
                    "embedding": vector,
                    "created_at": datetime.utcnow(),
                })
                stored += 1

        logger.info("[RAG] indexed idea #%s -> %s chunks", idea_id, stored)
        return {"idea_id": idea_id, "chunks": stored}

    @staticmethod
    def _collect_sources(db, idea: dict) -> list[tuple[str, str, str]]:
        """Everything Inceptrax knows about this idea, as (type, title, text)."""
        idea_id = idea["id"]
        out: list[tuple[str, str, str]] = []

        core = "\n".join(filter(None, [
            f"Title: {idea.get('title', '')}",
            f"Description: {idea.get('description', '')}",
            f"Problem: {idea.get('problem', '')}",
            f"Solution: {idea.get('solution', '')}",
            f"Target audience: {idea.get('audience', '')}",
            f"Industry: {idea.get('industry') or idea.get('market', '')}",
        ]))
        out.append(("idea", "Idea overview", core))

        for stage in db.stage_results.find({"idea_id": idea_id}):
            name = stage.get("stage_name", "stage")
            text = RAGService._flatten(stage.get("data") or stage.get("result") or {})
            if text:
                out.append(("stage_result", name.replace("_", " ").title(), text))

        for digest in db.idea_watcher_runs.find({"idea_id": idea_id}).sort("created_at", -1).limit(4):
            parts = [digest.get("intro", ""), digest.get("takeaway", "")]
            for f in (digest.get("findings") or []):
                parts.append(f"{f.get('title','')}: {f.get('why','')}")
            out.append(("watcher_digest", digest.get("subject", "Market digest"),
                        "\n".join(p for p in parts if p)))

        for snap in db.competitor_snapshots.find({"idea_id": idea_id}).sort("threat_score", -1).limit(8):
            out.append((
                "competitor",
                f"Competitor: {snap.get('competitor_name','')}",
                "\n".join(filter(None, [
                    snap.get("summary", ""),
                    f"Threat score: {snap.get('threat_score')}/10",
                    f"Why it matters: {snap.get('why_threat','')}",
                    f"Their gap: {snap.get('their_weakness','')}",
                ])),
            ))

        for pivot in db.pivot_suggestions.find({"idea_id": idea_id}).sort("created_at", -1).limit(3):
            opts = "\n".join(
                f"- {o.get('direction','')}: {o.get('what_changes','')}"
                for o in (pivot.get("options") or [])
            )
            out.append(("pivot", "Pivot assessment",
                        f"Recommendation: {pivot.get('recommendation','')}\n"
                        f"{pivot.get('rationale','')}\n{opts}"))

        return [(t, ti, tx) for t, ti, tx in out if (tx or "").strip()]

    @staticmethod
    def _flatten(obj, depth: int = 0) -> str:
        """Turn nested analysis JSON into readable prose for embedding."""
        if depth > 3:
            return ""
        if isinstance(obj, str):
            return obj
        if isinstance(obj, (int, float, bool)):
            return str(obj)
        if isinstance(obj, list):
            return "\n".join(filter(None, (RAGService._flatten(v, depth + 1) for v in obj[:12])))
        if isinstance(obj, dict):
            parts = []
            for k, v in obj.items():
                if k in ("_id", "embedding", "id"):
                    continue
                text = RAGService._flatten(v, depth + 1)
                if text:
                    parts.append(f"{str(k).replace('_', ' ').title()}: {text}")
            return "\n".join(parts)
        return ""

    @staticmethod
    def _chunk(text: str) -> list[str]:
        """Split on paragraph boundaries, packing up to CHUNK_CHARS."""
        text = (text or "").strip()
        if len(text) <= CHUNK_CHARS:
            return [text] if text else []

        chunks, current = [], ""
        for para in text.split("\n"):
            if len(current) + len(para) + 1 > CHUNK_CHARS and current:
                chunks.append(current.strip())
                current = para
            else:
                current = f"{current}\n{para}" if current else para
        if current.strip():
            chunks.append(current.strip())
        return chunks

    # ── Retrieval ─────────────────────────────────────────────────────────

    @staticmethod
    def retrieve(query: str, idea_id: int, user_id: int, k: int = DEFAULT_K) -> list[dict]:
        """
        Most relevant chunks for a query, scoped to one user's one idea.

        `user_id` MUST come from the authenticated session. Both filters are
        applied in every code path below — there is no path that searches
        without them.
        """
        from app import get_db

        db = get_db()
        query_vec = RAGService.embed(query, is_query=True)
        if not query_vec:
            return []

        try:
            pipeline = [
                {"$vectorSearch": {
                    "index": VECTOR_INDEX,
                    "path": "embedding",
                    "queryVector": query_vec,
                    "numCandidates": 100,
                    "limit": k,
                    "filter": {"idea_id": idea_id, "user_id": user_id},
                }},
                {"$project": {
                    "_id": 0, "content": 1, "source_type": 1, "title": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }},
            ]
            hits = list(db.idea_context.aggregate(pipeline))
            if hits:
                return hits
        except Exception as e:
            logger.info("[RAG] $vectorSearch unavailable (%s) — using in-memory scoring", type(e).__name__)

        return RAGService._brute_force(db, query_vec, idea_id, user_id, k)

    @staticmethod
    def _brute_force(db, query_vec, idea_id: int, user_id: int, k: int) -> list[dict]:
        """
        Cosine similarity in Python.

        Same security filter as the indexed path. Fine for thousands of chunks;
        if this ever becomes slow, that is the signal to create the Atlas
        vector index (see create_vector_index_instructions()).
        """
        docs = list(db.idea_context.find(
            {"idea_id": idea_id, "user_id": user_id},
            {"content": 1, "source_type": 1, "title": 1, "embedding": 1, "_id": 0},
        ))
        if not docs:
            return []

        qnorm = math.sqrt(sum(x * x for x in query_vec)) or 1.0
        scored = []
        for d in docs:
            vec = d.get("embedding") or []
            if len(vec) != len(query_vec):
                continue
            dot = sum(a * b for a, b in zip(query_vec, vec))
            dnorm = math.sqrt(sum(x * x for x in vec)) or 1.0
            scored.append({
                "content": d.get("content", ""),
                "source_type": d.get("source_type", ""),
                "title": d.get("title", ""),
                "score": dot / (qnorm * dnorm),
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:k]

    # ── Question answering ────────────────────────────────────────────────

    @staticmethod
    def ask(question: str, idea_id: int, user_id: int) -> dict:
        """Answer a question grounded strictly in this idea's own context."""
        from app.services.gemini_service import GeminiService

        chunks = RAGService.retrieve(question, idea_id, user_id)
        if not chunks:
            return {
                "answer": (
                    "I don't have any analysis indexed for this idea yet. "
                    "Run the analysis first, then ask again."
                ),
                "sources": [],
                "grounded": False,
            }

        context = "\n\n".join(
            f"[{c['source_type']} — {c['title']}]\n{c['content']}" for c in chunks
        )

        prompt = f"""Answer the founder's question using ONLY the context below,
which comes from their own startup analysis.

CONTEXT
{context}

QUESTION
{question}

Rules:
- Answer only from the context. If it does not contain the answer, say so
  plainly and suggest which analysis would provide it.
- Be specific and cite what you are drawing on, e.g. "your competitor analysis
  found...".
- Be concise: 2-4 sentences unless the question genuinely needs more.
- Never invent numbers, competitors, or facts that are not in the context.

Return JSON only: {{"answer": "...", "confident": true or false}}"""

        try:
            res = GeminiService.call_gemini(prompt, stage="rag_ask")
            if res.get("success") and isinstance(res.get("data"), dict):
                return {
                    "answer": str(res["data"].get("answer", "")).strip(),
                    "confident": bool(res["data"].get("confident", False)),
                    "sources": [
                        {"type": c["source_type"], "title": c["title"],
                         "score": round(float(c.get("score", 0)), 3)}
                        for c in chunks
                    ],
                    "grounded": True,
                }
        except Exception as e:
            logger.warning("[RAG] answer generation failed: %s", e)

        return {
            "answer": "I couldn't generate an answer just now. Please try again.",
            "sources": [],
            "grounded": False,
        }

    # ── Ops helper ────────────────────────────────────────────────────────

    @staticmethod
    def create_vector_index_instructions() -> dict:
        """
        The Atlas index definition, for when brute-force scoring outgrows itself.

        Atlas Search indexes cannot be created from the driver, so this returns
        the JSON to paste into Atlas → Search → Create Search Index.
        """
        return {
            "index_name": VECTOR_INDEX,
            "collection": "idea_context",
            "definition": {
                "fields": [
                    {"type": "vector", "path": "embedding",
                     "numDimensions": EMBED_DIMS, "similarity": "cosine"},
                    {"type": "filter", "path": "idea_id"},
                    {"type": "filter", "path": "user_id"},
                ]
            },
            "note": (
                "Until this index exists, retrieval uses in-memory cosine "
                "similarity with identical results and identical security "
                "filtering — just more CPU per query."
            ),
        }
