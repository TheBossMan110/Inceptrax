"""
Inlined AI prompt templates for all 8 analysis stages + system prompt.

Previously stored as .txt files in /prompts/ — now embedded directly
in code so no external file dependencies exist.
"""

SYSTEM_PROMPT = """You are Inceptrax AI, a senior startup consultant and venture capitalist.
Your goal is to provide honest, data-driven, and actionable advice to founders.
IMPORTANT: Use simple, easy-to-understand language. Avoid complex business jargon. Explain concepts as if to a beginner.
Do not just praise ideas; look for flaws, competitive threats, and market hurdles.
Always return structured data that can be parsed as JSON."""


IDEA_CONTEXT_HEADER = """=== IDEA CONTEXT (ANALYZE SPECIFICALLY FOR THIS — DO NOT USE GENERIC TEMPLATES) ===
Idea Title: {title}
Description: {description}
Industry: {industry}
Target Market: {target_market}
Target Audience: {target_audience}
Problem Being Solved: {problem}
Proposed Solution: {solution}
Current Stage: {stage}
=== END IDEA CONTEXT ===

{previous_context}
"""

IDEA_CONTEXT_HEADER_WITH_RESEARCH = """=== IDEA CONTEXT (ANALYZE SPECIFICALLY FOR THIS — DO NOT USE GENERIC TEMPLATES) ===
Idea Title: {title}
Description: {description}
Industry: {industry}
Target Market: {target_market}
Target Audience: {target_audience}
Problem Being Solved: {problem}
Proposed Solution: {solution}
Current Stage: {stage}
=== END IDEA CONTEXT ===

{previous_context}

{research_data}
"""

# ─── Stage 1: Idea Validation ─────────────────────────────────────────────────
IDEA_VALIDATION_PROMPT = IDEA_CONTEXT_HEADER + """
TASK: Validate this SPECIFIC startup idea. Assess the problem severity, solution strength, and overall feasibility. Be honest — look for both strengths and flaws.

Return the response in this EXACT JSON format:
{{
    "score": 0-100,
    "problem_analysis": {{
        "severity": "Critical / Significant / Moderate / Minor",
        "evidence": "Why this problem matters, specific to this idea",
        "affected_population": "Who suffers from this problem and how many"
    }},
    "solution_analysis": {{
        "uniqueness": "High / Medium / Low",
        "feasibility": "High / Medium / Low",
        "evidence": "Why this solution works or doesn't"
    }},
    "scores": {{
        "market_demand": {{ "label": "High/Medium/Low", "value": 0-100 }},
        "problem_severity": {{ "label": "Severe/Moderate/Mild", "value": 0-100 }},
        "growth_potential": {{ "label": "Strong/Moderate/Low", "value": 0-100 }}
    }},
    "strengths": [
        "Strength 1 specific to this idea",
        "Strength 2",
        "Strength 3",
        "Strength 4"
    ],
    "risks": [
        "Risk 1 specific to this idea",
        "Risk 2",
        "Risk 3",
        "Risk 4"
    ],
    "recommendation": "2-3 sentence executive recommendation for the founder",
    "key_insight": "One paragraph about the most important validation finding"
}}

RULES:
- Be specific to THIS idea — never give generic advice
- Be honest about weaknesses — founders need the truth
- All strengths and risks must directly relate to the provided idea details
- Use simple, non-technical language that anyone can understand
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 2: Market Research ─────────────────────────────────────────────────
MARKET_RESEARCH_PROMPT = IDEA_CONTEXT_HEADER_WITH_RESEARCH + """
TASK: Perform comprehensive market research for THIS SPECIFIC idea in THIS SPECIFIC industry.

Return the response in this EXACT JSON format:
{{
    "tam": "Total Addressable Market with dollar amount and year",
    "sam": "Serviceable Addressable Market with dollar amount",
    "som": "Serviceable Obtainable Market with dollar amount",
    "cagr": "Compound Annual Growth Rate percentage",
    "score": 0-100,
    "trends": [
        {{ "title": "Trend name", "description": "How this trend affects THIS idea", "impact": "High/Medium/Low" }},
        {{ "title": "...", "description": "...", "impact": "..." }}
    ],
    "segments": [
        {{ "name": "Segment name", "description": "Description specific to this idea", "percentage": "XX%", "wtp": "High/Medium/Low" }}
    ],
    "key_insight": "One paragraph synthesizing the most important market finding for this specific idea"
}}

RULES:
- All numbers must be realistic and specific to the {industry} industry
- Use recent data (2024-2025) where possible
- If real research data is provided above, incorporate it — do NOT ignore it
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 3: Target Audience ─────────────────────────────────────────────────
TARGET_AUDIENCE_PROMPT = IDEA_CONTEXT_HEADER + """
TASK: Create a detailed target audience profile for THIS SPECIFIC idea. Identify who will use this product, what motivates them, and how to reach them.

Return the response in this EXACT JSON format:
{{
    "score": 0-100,
    "primary_persona": {{
        "name": "A realistic persona name",
        "age_range": "XX-XX",
        "role": "Their job title or life role",
        "daily_life": "A day in their life and where the problem appears",
        "pain_points": ["Pain 1 specific to this idea", "Pain 2", "Pain 3"],
        "goals": ["Goal 1", "Goal 2", "Goal 3"],
        "tech_comfort": "High/Medium/Low",
        "spending_power": "Description of their budget for this type of solution",
        "where_they_hang_out": ["Platform 1", "Platform 2", "Platform 3"]
    }},
    "secondary_personas": [
        {{
            "name": "Persona name",
            "description": "Brief description",
            "why_they_need_it": "Reason specific to this idea"
        }}
    ],
    "audience_size_estimate": "Estimated number of people who fit this profile",
    "acquisition_difficulty": "Easy/Moderate/Hard with explanation",
    "key_insight": "One paragraph about the most important finding about this audience"
}}

RULES:
- Personas must be specific to THIS idea and THIS industry — not generic
- Use insights from validation and market research stages if provided
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 4: Competitor Analysis ─────────────────────────────────────────────
COMPETITOR_ANALYSIS_PROMPT = IDEA_CONTEXT_HEADER_WITH_RESEARCH + """
TASK: Identify and analyze REAL competitors for THIS SPECIFIC idea. Do NOT make up companies — use real ones that exist in this space.

Return the response in this EXACT JSON format:
{{
    "score": 0-100,
    "top_competitors": [
        {{
            "name": "Real company name",
            "type": "Direct/Indirect",
            "threat": "High/Medium/Low",
            "description": "What they do and how they compete with this idea",
            "strengths": ["Strength 1", "Strength 2"],
            "weaknesses": ["Weakness 1", "Weakness 2"],
            "funding": "Known funding amount or 'Unknown'",
            "market_share": "Estimated percentage or 'Unknown'"
        }}
    ],
    "market_gaps": [
        "Gap 1 that this idea can exploit",
        "Gap 2",
        "Gap 3"
    ],
    "competitive_advantage": "What makes THIS idea different from all competitors listed above",
    "barriers_to_entry": ["Barrier 1", "Barrier 2"],
    "key_insight": "One paragraph about the competitive positioning of this idea"
}}

RULES:
- List at least 3 REAL competitors (companies that actually exist)
- If competitor research data is provided above, USE it — do not ignore it
- Be honest about threats — don't sugar-coat competitive risks
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 5: Monetization ────────────────────────────────────────────────────
MONETIZATION_PROMPT = IDEA_CONTEXT_HEADER + """
TASK: Design a realistic monetization strategy for THIS SPECIFIC idea based on the market research, target audience, and competitive landscape analyzed in previous stages.

Return the response in this EXACT JSON format:
{{
    "score": 0-100,
    "pricing_model": "Freemium / Subscription / Usage-based / One-time / Marketplace",
    "recommended_strategy": "2-3 sentence explanation of why this model fits this idea",
    "revenue_model": "How money flows — who pays, for what, and how",
    "plans": [
        {{
            "name": "Free / Starter / Pro / Enterprise",
            "price": "$0 / $XX/mo / Custom",
            "target": "Who this plan is for",
            "features": ["Feature 1", "Feature 2", "Feature 3"]
        }}
    ],
    "conversion_logic": "How free users become paid users — the specific trigger",
    "unit_economics": {{
        "estimated_cac": "Customer acquisition cost estimate",
        "estimated_ltv": "Lifetime value estimate",
        "ltv_cac_ratio": "Estimated ratio"
    }},
    "key_insight": "One paragraph about the most important monetization decision for this idea"
}}

RULES:
- Pricing must be realistic for the {industry} industry and this target audience
- Use competitor pricing from previous analysis as benchmarks
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 6: MVP Planning ────────────────────────────────────────────────────
MVP_PLANNING_PROMPT = IDEA_CONTEXT_HEADER + """
TASK: Design a practical MVP (Minimum Viable Product) blueprint for THIS SPECIFIC idea. Focus on what to build first to validate the core hypothesis with real users.

Return the response in this EXACT JSON format:
{{
    "score": 0-100,
    "core_hypothesis": "The ONE thing this MVP needs to prove",
    "phases": [
        {{
            "phase": "Phase 1 — Foundation (Week 1-2)",
            "features": [
                {{
                    "feature_name": "Feature name",
                    "description": "What it does, specific to this idea",
                    "priority": "Must-have / Nice-to-have / Later",
                    "business_value": "Why this matters for validation",
                    "effort": "Low / Medium / High"
                }}
            ]
        }},
        {{
            "phase": "Phase 2 — Core (Week 3-4)",
            "features": []
        }},
        {{
            "phase": "Phase 3 — Polish (Week 5-6)",
            "features": []
        }}
    ],
    "tech_stack": {{
        "frontend": "Recommended frontend technology",
        "backend": "Recommended backend technology",
        "database": "Recommended database",
        "hosting": "Recommended hosting platform",
        "reasoning": "Why this stack fits this specific idea"
    }},
    "success_metrics": [
        {{ "metric": "Metric name", "target": "Target value for MVP validation", "why": "Why this proves the hypothesis" }}
    ],
    "estimated_timeline": "X weeks to launch MVP",
    "estimated_cost": "Rough cost estimate for MVP development",
    "key_insight": "One paragraph about the most critical MVP decision for this idea"
}}

RULES:
- Features must be specific to THIS idea — not generic startup features
- Prioritize ruthlessly — MVP means MINIMUM viable product
- Use the monetization strategy from previous analysis to inform feature prioritization
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 7: Go-To-Market Strategy ──────────────────────────────────────────
GTM_STRATEGY_PROMPT = IDEA_CONTEXT_HEADER + """
TASK: Design a detailed, actionable go-to-market strategy for THIS SPECIFIC idea. Focus on getting the first 1,000 users.

Return the response in this EXACT JSON format:
{{
    "score": 0-100,
    "launch_plan": "3-4 sentence overview of the launch approach",
    "acquisition_channels": [
        {{
            "channel": "Channel name",
            "strategy": "Specific tactics for THIS idea on this channel",
            "estimated_cost": "Free / Low / Medium / High",
            "expected_impact": "High / Medium / Low"
        }}
    ],
    "messaging": {{
        "hook": "The attention-grabbing first sentence",
        "value_prop": "The core value proposition in one sentence",
        "positioning": "How to position against competitors"
    }},
    "funnel_stages": {{
        "awareness": "How target audience discovers this product",
        "activation": "What the 'aha moment' is for first-time users",
        "conversion": "What triggers the user to pay or commit"
    }},
    "early_traction": "Detailed strategy to get the first 1,000 users in 90 days",
    "partnerships": ["Potential partnership 1", "Potential partnership 2"],
    "key_insight": "One paragraph about the most important GTM decision for this idea"
}}

RULES:
- Strategy must be specific to THIS idea, THIS audience, and THIS industry
- Use insights from all previous stages (audience personas, competitor gaps, pricing)
- Be practical — suggest channels the founder can actually use at their current stage
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""

# ─── Stage 8: Final Report ────────────────────────────────────────────────────
FINAL_REPORT_PROMPT = IDEA_CONTEXT_HEADER + """
TASK: Synthesize ALL previous stage results into a comprehensive final report. This is the executive summary that ties everything together.

Return the response in this EXACT JSON format:
{{
    "overall_score": 0-100,
    "verdict": "Ready to Launch / Needs Refinement / High Risk — Reconsider",
    "risk_level": "Low / Medium / High",
    "one_liner": "One sentence that summarizes this idea's potential",
    "executive_summary": "3-5 sentence executive summary pulling key findings from every stage",
    "top_strengths": [
        "Strength 1 with specific evidence from the analysis",
        "Strength 2",
        "Strength 3",
        "Strength 4"
    ],
    "top_risks": [
        "Risk 1 with specific evidence",
        "Risk 2",
        "Risk 3",
        "Risk 4"
    ],
    "top_recommendations": [
        "Recommendation 1 — actionable, specific",
        "Recommendation 2",
        "Recommendation 3"
    ],
    "ninety_day_plan": {{
        "month_1": {{
            "focus": "Foundation",
            "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
        }},
        "month_2": {{
            "focus": "Build",
            "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
        }},
        "month_3": {{
            "focus": "Launch",
            "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"]
        }}
    }},
    "key_metrics_to_track": [
        {{ "metric": "Metric name", "target": "Target value", "why": "Why this matters" }}
    ]
}}

RULES:
- The overall_score must be a weighted average reflecting ALL stages — not just one
- Score >= 75: "Ready to Launch". Score 50-74: "Needs Refinement". Score < 50: "High Risk — Reconsider"
- Every strength and risk must reference specific findings from previous stages
- The 90-day plan must be actionable and specific to THIS idea
- Use simple, non-technical language
- Return ONLY valid JSON, no markdown
"""


# ─── Lookup Map ───────────────────────────────────────────────────────────────
PROMPTS = {
    "idea_validation_prompt.txt": IDEA_VALIDATION_PROMPT,
    "market_research_prompt.txt": MARKET_RESEARCH_PROMPT,
    "target_audience_prompt.txt": TARGET_AUDIENCE_PROMPT,
    "competitor_analysis_prompt.txt": COMPETITOR_ANALYSIS_PROMPT,
    "monetization_prompt.txt": MONETIZATION_PROMPT,
    "mvp_planning_prompt.txt": MVP_PLANNING_PROMPT,
    "gtm_strategy_prompt.txt": GTM_STRATEGY_PROMPT,
    "final_report_prompt.txt": FINAL_REPORT_PROMPT,
}
