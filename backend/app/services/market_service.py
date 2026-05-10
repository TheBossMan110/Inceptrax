import os
import json
import requests
from app.models.user_model import Idea


class MarketService:
    """Handles web research for real-time market & competitor data.

    Provider chain: Tavily (best for AI) → SerpAPI (Google) → fallback empty.
    Firecrawl: Deep-scrapes competitor websites for detailed analysis.
    """

    # ─── Tavily (Primary — AI-optimized search) ──────────────────────────────

    @staticmethod
    def _search_tavily(query, max_results=5):
        """Search using Tavily API — returns AI-ready summaries."""
        api_key = os.environ.get('TAVILY_API_KEY', '')
        if not api_key:
            return None

        # Tavily max query length is 400 characters — truncate at word boundary
        if len(query) > 380:
            query = query[:380].rsplit(' ', 1)[0]

        try:
            response = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "max_results": max_results,
                    "search_depth": "advanced",
                    "include_answer": True,
                },
                timeout=30
            )

            if response.status_code != 200:
                print(f"[Tavily] Error {response.status_code}: {response.text[:200]}")
                return None

            data = response.json()
            results = []

            answer = data.get("answer", "")

            for r in data.get("results", []):
                results.append({
                    "title": r.get("title", ""),
                    "link": r.get("url", ""),
                    "snippet": r.get("content", "")[:300],
                    "source": r.get("url", "").split("/")[2] if r.get("url") else "",
                    "score": r.get("score", 0),
                })

            return {"results": results, "answer": answer}

        except Exception as e:
            print(f"[Tavily] Search failed: {str(e)[:200]}")
            return None

    # ─── SerpAPI (Fallback — Google Search) ──────────────────────────────────

    @staticmethod
    def _search_serpapi(query, num=3):
        """Fallback search using SerpAPI."""
        api_key = os.environ.get("SERPAPI_KEY", "")
        if not api_key:
            return None

        try:
            from serpapi import GoogleSearch
            params = {
                "engine": "google",
                "q": query,
                "api_key": api_key,
                "num": num,
            }
            search = GoogleSearch(params)
            data = search.get_dict()

            results = []
            for r in data.get("organic_results", []):
                results.append({
                    "title": r.get("title", ""),
                    "link": r.get("link", ""),
                    "snippet": r.get("snippet", ""),
                    "source": r.get("source", ""),
                })

            return {"results": results, "answer": ""}

        except Exception as e:
            print(f"[SerpAPI] Search failed: {str(e)[:200]}")
            return None

    # ─── Unified search (Tavily → SerpAPI) ───────────────────────────────────

    @staticmethod
    def search(query, max_results=5):
        """Search with automatic fallback: Tavily → SerpAPI."""
        result = MarketService._search_tavily(query, max_results)
        if result and result.get("results"):
            print(f"[Research] Tavily returned {len(result['results'])} results for: {query[:60]}")
            return result

        result = MarketService._search_serpapi(query, max_results)
        if result and result.get("results"):
            print(f"[Research] SerpAPI returned {len(result['results'])} results for: {query[:60]}")
            return result

        print(f"[Research] No results for: {query[:60]}")
        return {"results": [], "answer": ""}

    # ─── Firecrawl (Deep competitor scraping) ────────────────────────────────

    @staticmethod
    def scrape_url(url):
        """Scrape a URL using Firecrawl and return clean markdown text."""
        api_key = os.environ.get('FIRECRAWL_API_KEY', '')
        if not api_key:
            return None

        try:
            response = requests.post(
                "https://api.firecrawl.dev/v1/scrape",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "url": url,
                    "formats": ["markdown"],
                },
                timeout=30
            )

            if response.status_code != 200:
                print(f"[Firecrawl] Error {response.status_code} for {url}")
                return None

            data = response.json()
            markdown = data.get("data", {}).get("markdown", "")

            if len(markdown) > 3000:
                markdown = markdown[:3000] + "\n\n[Content truncated...]"

            print(f"[Firecrawl] Scraped {len(markdown)} chars from {url}")
            return markdown

        except Exception as e:
            print(f"[Firecrawl] Scrape failed for {url}: {str(e)[:200]}")
            return None

    # ─── Public API Methods ──────────────────────────────────────────────────

    @staticmethod
    def fetch_market_data(idea_id):
        """Fetch real-time market data for a specific idea."""
        idea = Idea.find_by_id(idea_id)
        if not idea:
            return None

        industry = (idea.industry or idea.market or "technology")[:80]
        title = (idea.title or "startup")[:60]

        queries = [
            f"{industry} market size and growth rate 2024 2025",
            f"{industry} industry statistics trends CAGR",
            f"top {industry} startups competitors {title} alternatives 2025",
        ]

        aggregated_results = []

        for query in queries:
            result = MarketService.search(query, max_results=3)
            for r in result.get("results", []):
                r["query"] = query
                aggregated_results.append(r)

        # Update idea analysis data
        if not idea.analysis_data:
            idea.analysis_data = {}

        if "market_research" not in idea.analysis_data:
            idea.analysis_data["market_research"] = {}

        current_market_data = idea.analysis_data.get("market_research", {})
        current_market_data["live_search"] = aggregated_results

        market_data_copy = dict(idea.analysis_data)
        market_data_copy["market_research"] = current_market_data
        idea.analysis_data = market_data_copy

        idea.save()

        return aggregated_results

    @staticmethod
    def deep_research(query):
        """Deep research using Tavily with AI answer summary."""
        result = MarketService.search(query, max_results=8)
        return {
            "answer": result.get("answer", ""),
            "sources": result.get("results", []),
        }
