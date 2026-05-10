"""
PDF Service — Professional branded 9-section analysis report.

Uses reportlab. Shows only real user data — missing fields are silently skipped.
Always uses Dark Executive brand colors.
"""
import os
import json
import tempfile
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib import colors

# ─── Brand Colors ──────────────────────────────────────────────────────────────
ACCENT      = HexColor("#6366F1")
ACCENT2     = HexColor("#8B5CF6")
BG_DARK     = HexColor("#0A0A14")
CARD        = HexColor("#111827")
TEXT        = HexColor("#F1F5F9")
MUTED       = HexColor("#94A3B8")
BODY_TEXT   = HexColor("#1E293B")
SUCCESS     = HexColor("#10B981")
WARNING     = HexColor("#F59E0B")
DANGER      = HexColor("#EF4444")
BORDER      = HexColor("#E2E8F0")
ROW_ALT     = HexColor("#F8FAFC")
ROW_EVEN    = white

PAGE_W, PAGE_H = A4
MARGIN = 1.8 * cm


# ─── Styles ────────────────────────────────────────────────────────────────────

def _build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["section_title"] = ParagraphStyle(
        "section_title",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=ACCENT,
        spaceAfter=8,
        spaceBefore=14,
    )
    styles["h2"] = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=BODY_TEXT,
        spaceAfter=4,
        spaceBefore=8,
    )
    styles["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10,
        textColor=BODY_TEXT,
        spaceAfter=4,
        leading=14,
    )
    styles["muted"] = ParagraphStyle(
        "muted",
        fontName="Helvetica",
        fontSize=9,
        textColor=HexColor("#64748B"),
        spaceAfter=3,
        leading=13,
    )
    styles["bullet"] = ParagraphStyle(
        "bullet",
        fontName="Helvetica",
        fontSize=10,
        textColor=BODY_TEXT,
        leftIndent=14,
        spaceAfter=3,
        leading=14,
    )
    styles["metric_label"] = ParagraphStyle(
        "metric_label",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=HexColor("#64748B"),
        spaceAfter=2,
    )
    styles["metric_value"] = ParagraphStyle(
        "metric_value",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=ACCENT,
        spaceAfter=2,
    )
    styles["cover_title"] = ParagraphStyle(
        "cover_title",
        fontName="Helvetica-Bold",
        fontSize=32,
        textColor=white,
        spaceAfter=12,
        leading=38,
    )
    styles["cover_sub"] = ParagraphStyle(
        "cover_sub",
        fontName="Helvetica",
        fontSize=14,
        textColor=HexColor("#94A3B8"),
        spaceAfter=8,
        leading=20,
    )
    styles["cover_meta"] = ParagraphStyle(
        "cover_meta",
        fontName="Helvetica",
        fontSize=10,
        textColor=HexColor("#64748B"),
        spaceAfter=4,
    )
    styles["tag"] = ParagraphStyle(
        "tag",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=ACCENT,
        spaceAfter=4,
    )
    styles["table_header"] = ParagraphStyle(
        "table_header",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=white,
    )
    styles["table_cell"] = ParagraphStyle(
        "table_cell",
        fontName="Helvetica",
        fontSize=9,
        textColor=BODY_TEXT,
        leading=12,
    )
    return styles


# ─── Helper Utilities ──────────────────────────────────────────────────────────

def _parse_str(raw, fallback="") -> str:
    """Safely convert any value to a clean display string."""
    if not raw and raw != 0:
        return fallback
    if isinstance(raw, str):
        # Handle JSON-encoded strings
        stripped = raw.strip()
        if stripped.startswith('{') or stripped.startswith('['):
            try:
                parsed = json.loads(stripped)
                return _parse_str(parsed, fallback)
            except Exception:
                pass
        return stripped
    if isinstance(raw, dict):
        # Try common text keys first
        for key in ("text", "value", "description", "content", "summary", "name", "title", "label", "step"):
            if raw.get(key) and isinstance(raw[key], str):
                return str(raw[key]).strip()
        # Fall back to joining all scalar values
        parts = [str(v) for v in raw.values() if v and not isinstance(v, (dict, list))]
        return " — ".join(parts) if parts else fallback
    if isinstance(raw, list):
        parts = [_parse_str(i) for i in raw[:3] if i]
        return ", ".join(p for p in parts if p) if parts else fallback
    return str(raw).strip()


def _parse_list(raw, max_items=8):
    if not raw:
        return []
    if isinstance(raw, list):
        out = []
        for i in raw[:max_items]:
            if not i:
                continue
            if isinstance(i, str):
                out.append(i.strip())
            elif isinstance(i, dict):
                # Try common text keys
                for k in ('text', 'title', 'name', 'description', 'value', 'step', 'feature', 'task'):
                    if i.get(k):
                        out.append(str(i[k]).strip())
                        break
                else:
                    parts = [str(v) for v in i.values() if v and isinstance(v, str)]
                    if parts:
                        out.append(parts[0])
            else:
                out.append(str(i))
        return out
    if isinstance(raw, str):
        lines = [l.strip().lstrip("•-*1234567890.) ") for l in raw.split("\n") if l.strip()]
        return lines[:max_items]
    if isinstance(raw, dict):
        for v in raw.values():
            if isinstance(v, list):
                return _parse_list(v, max_items)
        return []
    return []



def _get_stage(analysis_data: dict, stage_name: str) -> dict:
    stages = analysis_data.get("stages", {})
    raw = stages.get(stage_name)
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    return {}


def _score_color(score):
    if score >= 75:
        return SUCCESS
    if score >= 50:
        return WARNING
    return DANGER


def _bullet(text, styles, color=None):
    col = f'<font color="#{color}">' if color else ''
    end_col = '</font>' if color else ''
    return Paragraph(f"• {col}{text}{end_col}", styles["bullet"])


def _metric_box(label, value, styles):
    """Returns table cell content list for a metric box."""
    return [
        Paragraph(label, styles["metric_label"]),
        Paragraph(str(value), styles["metric_value"]),
    ]


def _hr(color=None, thickness=1):
    return HRFlowable(width="100%", thickness=thickness,
                      color=color or ACCENT, spaceAfter=6, spaceBefore=6)


def _section_title(text, styles):
    return Paragraph(text, styles["section_title"])


def _metrics_table(items, styles):
    """Render a row of metric boxes. items = list of (label, value) tuples."""
    items = [(l, v) for l, v in items if _parse_str(v)]
    if not items:
        return []
    n = len(items)
    col_w = (PAGE_W - 2 * MARGIN) / n
    data = [[Paragraph(lbl, styles["metric_label"]) for lbl, _ in items],
            [Paragraph(_parse_str(val)[:40], styles["metric_value"]) for _, val in items]]
    t = Table(data, colWidths=[col_w] * n)
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return [t, Spacer(1, 8)]


# ─── Header / Footer ───────────────────────────────────────────────────────────

def _on_page(canvas, doc, idea_title=""):
    canvas.saveState()

    # Header bar
    canvas.setFillColor(ACCENT)
    canvas.rect(0, PAGE_H - 1.2 * cm, PAGE_W, 1.2 * cm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(MARGIN, PAGE_H - 0.85 * cm, f"Inceptrax  ·  {idea_title[:60]}")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.85 * cm, f"Page {doc.page}")

    # Footer
    canvas.setFillColor(HexColor("#64748B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(PAGE_W / 2, 0.6 * cm,
                             "Confidential — Generated by Inceptrax AI Platform")

    canvas.restoreState()


# ─── Section Builders ──────────────────────────────────────────────────────────

def _build_cover(data, styles):
    elements = []

    title = _parse_str(data.get("title"), "Untitled Idea")
    one_liner = _parse_str(data.get("one_liner") or data.get("description", "")[:180])
    score = data.get("overall_score") or 0
    risk = ""
    industry = _parse_str(data.get("industry") or data.get("market", ""))

    fr = _get_stage(data, "final_report")
    if fr:
        risk = _parse_str(fr.get("risk_level"))

    from datetime import datetime
    date_str = datetime.utcnow().strftime("%B %d, %Y")

    # Dark cover block
    cover_data = [[
        Paragraph(title, styles["cover_title"]),
    ]]
    if one_liner:
        cover_data.append([Paragraph(one_liner, styles["cover_sub"])])
    if score:
        score_col = _score_color(score)
        cover_data.append([Paragraph(
            f'<font color="{score_col.hexval()}"><b>Score: {score} / 100</b></font>', styles["body"]
        )])
    if risk:
        cover_data.append([Paragraph(f"Risk Level: {risk.title()}", styles["muted"])])
    if industry:
        cover_data.append([Paragraph(f"Industry: {industry}", styles["muted"])])
    cover_data.append([Paragraph(f"Date: {date_str}", styles["muted"])])
    cover_data.append([Paragraph("Confidential — Generated by Inceptrax AI Platform", styles["muted"])])

    ct = Table(cover_data, colWidths=[PAGE_W - 2 * MARGIN])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
    ]))
    elements.append(ct)
    elements.append(PageBreak())
    return elements


def _build_validation(data, styles):
    v = _get_stage(data, "validation")
    if not v:
        return []
    elements = [_section_title("Idea Validation", styles), _hr()]

    score = data.get("overall_score") or 0
    problem = _parse_str(v.get("problem") or v.get("problem_statement"))
    solution = _parse_str(v.get("solution") or v.get("solution_description"))
    strengths = _parse_list(v.get("strengths") or v.get("key_strengths"), 5)
    risks = _parse_list(v.get("risks") or v.get("challenges"), 5)
    opportunities = _parse_list(v.get("opportunities"), 4)

    if score:
        elements += _metrics_table([("Overall Score", f"{score} / 100")], styles)

    if problem:
        elements.append(Paragraph("Problem Statement", styles["h2"]))
        elements.append(Paragraph(problem, styles["body"]))
        elements.append(Spacer(1, 6))

    if solution:
        elements.append(Paragraph("Proposed Solution", styles["h2"]))
        elements.append(Paragraph(solution, styles["body"]))
        elements.append(Spacer(1, 6))

    if strengths:
        elements.append(Paragraph("Strengths", styles["h2"]))
        for s in strengths:
            elements.append(_bullet(s, styles, color="10B981"))

    if risks:
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("Risks", styles["h2"]))
        for r in risks:
            elements.append(_bullet(r, styles, color="EF4444"))

    if opportunities:
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("Opportunities", styles["h2"]))
        for o in opportunities:
            elements.append(_bullet(o, styles, color="F59E0B"))

    elements.append(PageBreak())
    return elements


def _build_market(data, styles):
    mr = _get_stage(data, "market_research")
    if not mr:
        return []
    elements = [_section_title("Market Research", styles), _hr()]

    tam = _parse_str(mr.get("tam") or mr.get("total_addressable_market"))
    sam = _parse_str(mr.get("sam") or mr.get("serviceable_addressable_market"))
    som = _parse_str(mr.get("som") or mr.get("serviceable_obtainable_market"))
    cagr = _parse_str(mr.get("cagr") or mr.get("growth_rate"))
    trends = _parse_list(mr.get("trends") or mr.get("market_trends"), 5)
    geo = _parse_str(mr.get("geography") or mr.get("geographic_focus"))
    overview = _parse_str(mr.get("overview") or mr.get("market_overview"))

    metric_pairs = [("TAM", tam), ("SAM", sam), ("SOM", som), ("CAGR", cagr)]
    elements += _metrics_table(metric_pairs, styles)

    if overview:
        elements.append(Paragraph("Market Overview", styles["h2"]))
        elements.append(Paragraph(overview, styles["body"]))

    if trends:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("Key Market Trends", styles["h2"]))
        for t in trends:
            elements.append(_bullet(t, styles))

    if geo:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("Geographic Focus", styles["h2"]))
        elements.append(Paragraph(geo, styles["body"]))

    elements.append(PageBreak())
    return elements


def _build_audience(data, styles):
    ta = _get_stage(data, "target_audience")
    if not ta:
        return []
    elements = [_section_title("Target Audience", styles), _hr()]

    personas = ta.get("personas") or ta.get("customer_segments") or []
    if isinstance(personas, dict):
        personas = [personas]
    channels = _parse_list(ta.get("acquisition_channels") or ta.get("channels"), 5)
    audience_size = _parse_str(ta.get("audience_size") or ta.get("market_size"))

    if audience_size:
        elements += _metrics_table([("Audience Size", audience_size)], styles)

    for i, p in enumerate(personas[:2]):
        if not isinstance(p, dict):
            continue
        elements.append(Paragraph(f"Persona {i+1}: {_parse_str(p.get('name') or p.get('role', ''))}", styles["h2"]))
        fields = [
            ("Role", p.get("role") or p.get("title")),
            ("Company Size", p.get("company_size") or p.get("company")),
            ("Pain Point", p.get("pain") or p.get("pain_point") or p.get("challenge")),
            ("Willingness to Pay", p.get("willingness_to_pay") or p.get("budget") or p.get("wtp")),
            ("Demographics", p.get("demographics")),
        ]
        for lbl, val in fields:
            val = _parse_str(val)
            if val:
                elements.append(Paragraph(f"<b>{lbl}:</b> {val}", styles["body"]))
        elements.append(Spacer(1, 6))

    if channels:
        elements.append(Paragraph("Acquisition Channels", styles["h2"]))
        for ch in channels:
            elements.append(_bullet(ch, styles))

    elements.append(PageBreak())
    return elements


def _build_competitors(data, styles):
    ca = _get_stage(data, "competitor_analysis")
    if not ca:
        return []
    elements = [_section_title("Competitive Analysis", styles), _hr()]

    competitors = ca.get("competitors") or ca.get("competitor_list") or []
    gaps = _parse_list(ca.get("market_gaps") or ca.get("gaps"), 4)
    moat = _parse_str(ca.get("competitive_moat") or ca.get("our_advantage") or ca.get("moat"))

    if isinstance(competitors, list) and competitors:
        # Build table
        headers = ["Competitor", "Type", "Threat Level", "Key Weakness"]
        t_data = [[Paragraph(h, styles["table_header"]) for h in headers]]
        for comp in competitors[:8]:
            if not isinstance(comp, dict):
                continue
            # Handle both singular and plural key names for weakness
            weakness_val = comp.get("weakness") or comp.get("key_weakness") or ""
            if not weakness_val:
                wlist = comp.get("weaknesses") or []
                if isinstance(wlist, list) and wlist:
                    weakness_val = wlist[0] if isinstance(wlist[0], str) else _parse_str(wlist[0])

            row = [
                Paragraph(_parse_str(comp.get("name") or comp.get("competitor"))[:35], styles["table_cell"]),
                Paragraph(_parse_str(comp.get("type") or comp.get("category"))[:20], styles["table_cell"]),
                Paragraph(_parse_str(comp.get("threat_level") or comp.get("threat"))[:15], styles["table_cell"]),
                Paragraph(_parse_str(weakness_val)[:120], styles["table_cell"]),
            ]
            t_data.append(row)

        if len(t_data) > 1:
            col_w = (PAGE_W - 2 * MARGIN)
            t = Table(t_data, colWidths=[col_w * 0.25, col_w * 0.15, col_w * 0.15, col_w * 0.45])
            style = TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ])
            for row_i in range(1, len(t_data)):
                if row_i % 2 == 0:
                    style.add("BACKGROUND", (0, row_i), (-1, row_i), ROW_ALT)
            t.setStyle(style)
            elements.append(t)
            elements.append(Spacer(1, 10))

    if gaps:
        elements.append(Paragraph("Market Gaps", styles["h2"]))
        for g in gaps:
            elements.append(_bullet(g, styles, color="6366F1"))

    if moat:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("Our Competitive Moat", styles["h2"]))
        moat_t = Table([[Paragraph(moat, styles["body"])]],
                       colWidths=[PAGE_W - 2 * MARGIN])
        moat_t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#EEF2FF")),
            ("BOX", (0, 0), (-1, -1), 2, ACCENT),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ]))
        elements.append(moat_t)

    elements.append(PageBreak())
    return elements


def _build_monetization(data, styles):
    mon = _get_stage(data, "monetization")
    if not mon:
        return []
    elements = [_section_title("Business Model & Monetization", styles), _hr()]

    revenue_model = _parse_str(mon.get("revenue_model") or mon.get("model_description"))
    tiers = mon.get("pricing_tiers") or mon.get("pricing") or []
    projections = mon.get("financial_projections") or mon.get("projections") or {}

    key_metrics = [
        ("MRR Year 1", mon.get("mrr_year_1") or mon.get("mrr")),
        ("LTV:CAC", mon.get("ltv_cac") or mon.get("ltv_to_cac")),
        ("Payback Period", mon.get("payback_period") or mon.get("payback")),
        ("Gross Margin", mon.get("gross_margin")),
    ]
    elements += _metrics_table(key_metrics, styles)

    if revenue_model:
        elements.append(Paragraph("Revenue Model", styles["h2"]))
        elements.append(Paragraph(revenue_model, styles["body"]))
        elements.append(Spacer(1, 6))

    if isinstance(tiers, list) and tiers:
        elements.append(Paragraph("Pricing Tiers", styles["h2"]))
        tier_headers = ["Plan", "Price", "Key Features"]
        t_data = [[Paragraph(h, styles["table_header"]) for h in tier_headers]]
        for tier in tiers[:5]:
            if not isinstance(tier, dict):
                continue
            features = _parse_list(tier.get("features") or tier.get("includes"), 3)
            row = [
                Paragraph(_parse_str(tier.get("name") or tier.get("plan"))[:25], styles["table_cell"]),
                Paragraph(_parse_str(tier.get("price") or tier.get("price_per_month"))[:20], styles["table_cell"]),
                Paragraph("\n".join(f"• {f}" for f in features)[:150], styles["table_cell"]),
            ]
            t_data.append(row)

        if len(t_data) > 1:
            col_w = PAGE_W - 2 * MARGIN
            t = Table(t_data, colWidths=[col_w * 0.25, col_w * 0.2, col_w * 0.55])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, ROW_ALT]),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 8))

    # Projections table
    if projections and isinstance(projections, dict):
        elements.append(Paragraph("Financial Projections", styles["h2"]))
        cols = ["Metric"] + list(projections.keys())[:4]
        first_metric_key = list(projections.keys())[0] if projections else None
        if first_metric_key:
            inner = projections.get(first_metric_key)
            if isinstance(inner, dict):
                rows = list(inner.keys())
                t_data = [[Paragraph(c, styles["table_header"]) for c in cols]]
                for row_k in rows[:6]:
                    row = [Paragraph(str(row_k), styles["table_cell"])]
                    for col_k in list(projections.keys())[:4]:
                        val = _parse_str(projections.get(col_k, {}).get(row_k, ""))
                        row.append(Paragraph(val[:20], styles["table_cell"]))
                    t_data.append(row)
                col_w = PAGE_W - 2 * MARGIN
                t = Table(t_data)
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                    ("TEXTCOLOR", (0, 0), (-1, 0), white),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, ROW_ALT]),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ]))
                elements.append(t)

    elements.append(PageBreak())
    return elements


def _build_mvp(data, styles):
    mvp = _get_stage(data, "mvp_planning")
    if not mvp:
        return []
    elements = [_section_title("MVP Planning", styles), _hr()]

    phases = mvp.get("phases") or mvp.get("roadmap_phases") or []
    budget = _parse_str(mvp.get("budget") or mvp.get("estimated_budget"))
    team = _parse_str(mvp.get("team_size") or mvp.get("team"))
    timeline = _parse_str(mvp.get("timeline") or mvp.get("total_duration"))
    tech_stack = _parse_list(mvp.get("tech_stack") or mvp.get("technology"), 6)

    summary_metrics = [("Timeline", timeline), ("Budget", budget), ("Team Size", team)]
    elements += _metrics_table(summary_metrics, styles)

    if isinstance(phases, list) and phases:
        elements.append(Paragraph("Development Phases", styles["h2"]))
        for i, phase in enumerate(phases[:4]):
            if not isinstance(phase, dict):
                continue
            pname = _parse_str(phase.get("name") or phase.get("phase") or f"Phase {i+1}")
            pdur = _parse_str(phase.get("duration") or phase.get("weeks") or phase.get("timeline"))
            features = _parse_list(phase.get("features") or phase.get("tasks") or phase.get("deliverables"), 5)

            label = f"Phase {i+1}: {pname}"
            if pdur:
                label += f"  ({pdur})"
            elements.append(Paragraph(label, styles["h2"]))
            for f in features:
                elements.append(_bullet(f, styles))
            elements.append(Spacer(1, 4))

    if tech_stack:
        elements.append(Paragraph("Recommended Tech Stack", styles["h2"]))
        for t in tech_stack:
            elements.append(_bullet(t, styles))

    elements.append(PageBreak())
    return elements


def _build_gtm(data, styles):
    gtm = _get_stage(data, "gtm_strategy")
    if not gtm:
        return []
    elements = [_section_title("Go-To-Market Strategy", styles), _hr()]

    launch_strategy = _parse_str(gtm.get("launch_strategy") or gtm.get("strategy"))
    channels = _parse_list(gtm.get("channels") or gtm.get("acquisition_channels"), 5)
    day1_goal = _parse_str(gtm.get("day_1_goal") or gtm.get("launch_goal"))
    cac = _parse_str(gtm.get("cac_target") or gtm.get("cac"))
    action_plan = _parse_list(gtm.get("action_plan") or gtm.get("ninety_day_plan") or gtm.get("steps"), 8)

    key_metrics = [("Day-1 Goal", day1_goal), ("CAC Target", cac)]
    elements += _metrics_table(key_metrics, styles)

    if launch_strategy:
        elements.append(Paragraph("Launch Strategy", styles["h2"]))
        elements.append(Paragraph(launch_strategy, styles["body"]))
        elements.append(Spacer(1, 6))

    if channels:
        elements.append(Paragraph("Acquisition Channels", styles["h2"]))
        for ch in channels:
            elements.append(_bullet(ch, styles))
        elements.append(Spacer(1, 6))

    if action_plan:
        elements.append(Paragraph("90-Day Action Plan", styles["h2"]))
        for j, step in enumerate(action_plan):
            elements.append(Paragraph(f"{j+1}. {step}", styles["body"]))

    elements.append(PageBreak())
    return elements


def _build_final_report(data, styles):
    fr = _get_stage(data, "final_report")
    if not fr:
        return []
    elements = [_section_title("Final Report & Recommendations", styles), _hr()]

    score = data.get("overall_score") or 0
    risk = _parse_str(fr.get("risk_level"))
    recs = _parse_list(fr.get("recommendations") or fr.get("top_recommendations"), 5)
    summary = _parse_str(fr.get("executive_summary") or fr.get("summary"))
    investor_ready = _parse_str(fr.get("investor_readiness"))
    checklist = _parse_list(fr.get("checklist") or fr.get("investor_checklist"), 8)

    if score:
        elements += _metrics_table([
            ("Overall Score", f"{score} / 100"),
            ("Risk Level", risk.title() if risk else ""),
        ], styles)

    if summary:
        elements.append(Paragraph("Executive Summary", styles["h2"]))
        elements.append(Paragraph(summary, styles["body"]))
        elements.append(Spacer(1, 6))

    if recs:
        elements.append(Paragraph("Top Recommendations", styles["h2"]))
        for i, r in enumerate(recs):
            elements.append(Paragraph(f"{i+1}. {r}", styles["body"]))
        elements.append(Spacer(1, 6))

    if investor_ready:
        elements.append(Paragraph("Investor Readiness", styles["h2"]))
        elements.append(Paragraph(investor_ready, styles["body"]))

    if checklist:
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("Investor Readiness Checklist", styles["h2"]))
        for item in checklist:
            elements.append(Paragraph(f"☐ {item}", styles["body"]))

    return elements


# ─── Main Generator ────────────────────────────────────────────────────────────

def generate_analysis_pdf(analysis_data: dict) -> str:
    """
    Generate a professional branded PDF report.
    Respects _export_sections for filtering and _export_font for typography.
    Returns absolute path to the generated PDF.
    """
    idea_id = analysis_data.get("id", "unknown")
    idea_title = _parse_str(analysis_data.get("title"), "Untitled")

    out_path = os.path.join(tempfile.gettempdir(), f"inceptrax_{idea_id}_analysis.pdf")
    styles = _build_styles()

    def on_page(canvas, doc):
        _on_page(canvas, doc, idea_title=idea_title)

    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        topMargin=2.2 * cm,
        bottomMargin=1.8 * cm,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
    )

    # Section filtering: map frontend keys to builder functions
    section_builders = {
        "executive_summary": _build_validation,
        "market_analysis": _build_market,
        "competitor_analysis": _build_competitors,
        "financial_projections": _build_monetization,
        "business_model": _build_mvp,
        "risk_assessment": _build_gtm,
        "investor_pitch": _build_final_report,
    }

    selected = analysis_data.get("_export_sections")

    elements = []
    elements += _build_cover(analysis_data, styles)  # Always include cover

    if selected and isinstance(selected, list):
        # Only build selected sections
        for key in selected:
            builder = section_builders.get(key)
            if builder:
                elements += builder(analysis_data, styles)
        # Also include audience if market_analysis is selected
        if "market_analysis" in selected:
            elements += _build_audience(analysis_data, styles)
    else:
        # Build all sections (default)
        elements += _build_validation(analysis_data, styles)
        elements += _build_market(analysis_data, styles)
        elements += _build_audience(analysis_data, styles)
        elements += _build_competitors(analysis_data, styles)
        elements += _build_monetization(analysis_data, styles)
        elements += _build_mvp(analysis_data, styles)
        elements += _build_gtm(analysis_data, styles)
        elements += _build_final_report(analysis_data, styles)

    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
    return out_path


