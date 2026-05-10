import os
import json
import time
import re
import requests
import google.generativeai as genai
from flask import current_app


class GeminiService:
    """Centralized AI service with triple fallback: Gemini → Groq → OpenRouter.

    Model: gemini-2.5-flash (configurable via GEMINI_MODEL env var).
    The platform NEVER shows quota errors to users — it silently
    switches providers when one is exhausted.
    """

    @staticmethod
    def get_model(system_instruction=None):
        """Get a configured Gemini model instance."""
        api_key = current_app.config.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Add it to your .env file.")

        genai.configure(api_key=api_key)
        model_name = current_app.config.get('GEMINI_MODEL', 'gemini-2.5-flash')

        kwargs = {}
        if system_instruction:
            kwargs['system_instruction'] = system_instruction

        try:
            return genai.GenerativeModel(model_name, **kwargs)
        except Exception as e:
            print(f"Failed to load model {model_name}, falling back: {e}")
            return genai.GenerativeModel('gemini-2.5-flash', **kwargs)

    # ─────────────────────────────────────────────────────────────────
    # Groq Fallback (Llama 3.3 70B)
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def _call_groq(prompt, stage, system_instruction=None):
        """Fallback to Groq API when Gemini quota is exhausted.

        Uses Llama 3.3 70B Versatile with JSON mode.
        Returns same dict format as call_gemini for drop-in compatibility.
        """
        groq_key = os.environ.get('GROQ_API_KEY', '')
        if not groq_key:
            return {"success": False, "data": None, "error": "GROQ_API_KEY not set — cannot fallback", "stage": stage}

        print(f"[GeminiService] Falling back to Groq for stage '{stage}'...")

        sys_msg = system_instruction or "You are Inceptrax AI, a senior startup consultant. Always return valid JSON."

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": sys_msg},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 8192,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=90
                )

                if response.status_code == 429:
                    # Parse retry delay from Groq error message
                    error_text = response.text
                    delay_match = re.search(r'try again in (\d+(?:\.\d+)?)\s*(?:ms|s)', error_text, re.IGNORECASE)
                    if delay_match:
                        delay_val = float(delay_match.group(1))
                        # If it says "ms", convert to seconds
                        if 'ms' in error_text[delay_match.start():delay_match.end()]:
                            wait_time = (delay_val / 1000) + 2
                        else:
                            wait_time = delay_val + 2
                    else:
                        wait_time = 30 * (attempt + 1)  # 30s, 60s, 90s

                    print(f"[Groq] Rate limited (attempt {attempt + 1}/{max_retries}). Waiting {wait_time:.1f}s...")
                    time.sleep(wait_time)
                    continue

                if response.status_code != 200:
                    error_text = response.text[:300]
                    print(f"[Groq] Error {response.status_code}: {error_text}")
                    return {"success": False, "data": None, "error": f"Groq API error: {error_text}", "stage": stage}

                raw_text = response.json()["choices"][0]["message"]["content"]
                result = GeminiService._parse_json_response(raw_text)
                print(f"[GeminiService] Groq fallback succeeded for stage '{stage}'")
                return {"success": True, "data": result, "stage": stage}

            except Exception as e:
                print(f"[Groq] Attempt {attempt + 1} failed for stage '{stage}': {str(e)[:200]}")
                if attempt < max_retries - 1:
                    time.sleep(10)
                    continue
                return {"success": False, "data": None, "error": f"Groq fallback failed: {str(e)}", "stage": stage}

        return {"success": False, "data": None, "error": "Groq max retries exceeded", "stage": stage}

    # ─────────────────────────────────────────────────────────────────
    # OpenRouter Fallback (3rd provider — Mistral/Llama/Qwen)
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def _call_openrouter(prompt, stage, system_instruction=None):
        """3rd fallback: OpenRouter API when both Gemini and Groq are exhausted."""
        or_key = os.environ.get('OPENROUTER_API_KEY', '')
        if not or_key:
            return {"success": False, "data": None, "error": "OPENROUTER_API_KEY not set", "stage": stage}

        print(f"[GeminiService] Falling back to OpenRouter for stage '{stage}'...")
        sys_msg = system_instruction or "You are Inceptrax AI, a senior startup consultant. Always return valid JSON."

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {or_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://inceptrax.com",
                        "X-Title": "Inceptrax",
                    },
                    json={
                        "model": "mistralai/mistral-small-3.1-24b-instruct:free",
                        "messages": [
                            {"role": "system", "content": sys_msg + "\n\nIMPORTANT: Your entire response must be a single valid JSON object. No markdown, no explanation, just JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 8192,
                    },
                    timeout=90
                )

                if response.status_code == 429:
                    wait_time = 30 * (attempt + 1)
                    print(f"[OpenRouter] Rate limited (attempt {attempt + 1}/{max_retries}). Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue

                if response.status_code != 200:
                    error_text = response.text[:300]
                    print(f"[OpenRouter] Error {response.status_code}: {error_text}")
                    return {"success": False, "data": None, "error": f"OpenRouter error: {error_text}", "stage": stage}

                raw_text = response.json()["choices"][0]["message"]["content"]
                result = GeminiService._parse_json_response(raw_text)
                print(f"[GeminiService] OpenRouter fallback succeeded for stage '{stage}'")
                return {"success": True, "data": result, "stage": stage}

            except Exception as e:
                print(f"[OpenRouter] Attempt {attempt + 1} failed: {str(e)[:200]}")
                if attempt < max_retries - 1:
                    time.sleep(10)
                    continue
                return {"success": False, "data": None, "error": f"OpenRouter failed: {str(e)}", "stage": stage}

        return {"success": False, "data": None, "error": "OpenRouter max retries exceeded", "stage": stage}

    # ─────────────────────────────────────────────────────────────────
    # Primary call with triple fallback: Gemini → Groq → OpenRouter
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def call_gemini(prompt, stage="general", system_instruction=None):
        """Make an AI call with triple fallback: Gemini → Groq → OpenRouter.

        The platform NEVER shows quota errors to users. If one provider
        hits its limit, it silently switches to the next.

        Args:
            prompt: The full prompt string (with idea context already injected)
            stage: Stage name for logging
            system_instruction: Optional system-level instruction

        Returns:
            dict with keys: success (bool), data (dict|None), error (str|None), stage (str)
        """
        if not system_instruction:
            from app.services.prompts import SYSTEM_PROMPT
            system_instruction = SYSTEM_PROMPT

        model = GeminiService.get_model(system_instruction=system_instruction)

        max_retries = 3
        quota_exhausted = False

        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        top_p=0.8,
                        top_k=40,
                        max_output_tokens=8192,
                        response_mime_type="application/json",
                    )
                )

                result = GeminiService._parse_json_response(response.text)
                return {"success": True, "data": result, "stage": stage}

            except Exception as e:
                error_str = str(e)
                is_rate_limit = "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower()

                if is_rate_limit:
                    is_daily = "PerDay" in error_str or "limit: 0" in error_str
                    if is_daily:
                        print(f"[GeminiService] Daily quota exhausted for stage '{stage}'. Switching to Groq...")
                        quota_exhausted = True
                        break

                    if attempt < max_retries - 1:
                        delay_match = re.search(r'retry.*?(\d+(?:\.\d+)?)\s*s', error_str, re.IGNORECASE)
                        wait_time = float(delay_match.group(1)) + 2 if delay_match else (15 * (attempt + 1))
                        print(f"[GeminiService] Rate limited on stage '{stage}' (attempt {attempt + 1}/{max_retries}). Waiting {wait_time:.0f}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        quota_exhausted = True
                        break

                print(f"[GeminiService] Error in stage '{stage}': {error_str[:200]}")
                return {"success": False, "data": None, "error": error_str, "stage": stage}

        # ── Fallback chain: Groq → OpenRouter ─────────────────────────
        if quota_exhausted:
            groq_result = GeminiService._call_groq(prompt, stage, system_instruction)
            if groq_result["success"]:
                return groq_result

            # Groq also failed → try OpenRouter
            print(f"[GeminiService] Groq failed for stage '{stage}'. Trying OpenRouter...")
            return GeminiService._call_openrouter(prompt, stage, system_instruction)

        return {"success": False, "data": None, "error": "Max retries exceeded", "stage": stage}

    # ─────────────────────────────────────────────────────────────────
    # Legacy methods
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def generate_analysis(prompt, system_instruction=None):
        """Legacy method — generates raw text analysis. Used by Layers Engine.
        Uses triple fallback: Gemini → Groq → OpenRouter."""
        try:
            model = GeminiService.get_model(system_instruction=system_instruction)

            combined_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction and not hasattr(model, '_system_instruction') else prompt

            response = model.generate_content(
                combined_prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            return response.text

        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower():
                print(f"[GeminiService] Gemini quota hit in generate_analysis. Trying Groq...")
                groq_result = GeminiService._call_groq(prompt, "layers_analysis", system_instruction)
                if groq_result["success"]:
                    return json.dumps(groq_result["data"])

                print(f"[GeminiService] Groq also failed. Trying OpenRouter...")
                or_result = GeminiService._call_openrouter(prompt, "layers_analysis", system_instruction)
                if or_result["success"]:
                    return json.dumps(or_result["data"])
            raise

    @staticmethod
    def extract_idea_from_media(mime_type, data, prompt="Extract the startup idea details", system_instruction=None):
        """Extract structured data from media files (audio, image, PDF)."""
        model = GeminiService.get_model()

        content_part = {
            "mime_type": mime_type,
            "data": data
        }

        if not system_instruction:
            system_instruction = """
            You are an expert startup analyst. Your job is to extract structured idea details from the provided input (Audio, Image, or PDF).

            Output JSON format:
            {
                "title": "Short catchy title",
                "description": "2-3 sentence summary",
                "problem": "What problem does it solve?",
                "solution": "How does it solve it?",
                "audience": "Who is it for?",
                "market": "Which market industry?"
            }
            """

        combined_prompt = [system_instruction, prompt, content_part]

        response = model.generate_content(
            combined_prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )

        return response.text

    @staticmethod
    def _parse_json_response(text):
        """Robustly parse JSON from Gemini/Groq response, handling markdown wrappers."""
        if not text:
            raise ValueError("Empty response from AI")

        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Strip markdown code blocks
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Try to find JSON object in response
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Failed to parse JSON from AI response: {text[:200]}...")
