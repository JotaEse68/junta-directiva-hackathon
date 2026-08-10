"""Helpers for `POST /context` (backend/main.py): HTML-to-text extraction and
the executive-briefing system prompt used to summarize additional context
(PDF/Word/URL/notes) before it gets folded into a board session's situation.

Ported from the original product's Vercel Edge Function
(`api/context.js`'s `extractTextFromHTML` and `SUMMARY_SYSTEM_PROMPT`) —
regex-based tag stripping, not a full HTML parser, matching the original's
approach. That's a deliberate scope call for a hackathon build: a real parser
(BeautifulSoup/lxml) would handle malformed markup more robustly, but this
mirrors the reference implementation exactly and avoids a new dependency for
what's a "clean up scraped text for a summarizer" utility, not a security
boundary.
"""

import re

_SCRIPT_RE = re.compile(r"<script[\s\S]*?</script>", re.IGNORECASE)
_STYLE_RE = re.compile(r"<style[\s\S]*?</style>", re.IGNORECASE)
_NAV_RE = re.compile(r"<nav[\s\S]*?</nav>", re.IGNORECASE)
_FOOTER_RE = re.compile(r"<footer[\s\S]*?</footer>", re.IGNORECASE)
_HEADER_RE = re.compile(r"<header[\s\S]*?</header>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")

MAX_CONTEXT_CHARS = 8000


def extract_text_from_html(html: str) -> str:
    """Strip an HTML page down to plain text, capped at 8000 chars.

    Mirrors `extractTextFromHTML` in the original `api/context.js`: drop
    script/style/nav/footer/header blocks first (so their contents don't leak
    into the extracted text), strip remaining tags, decode the handful of
    entities the original handled, collapse whitespace, then cap length.
    """
    clean = _SCRIPT_RE.sub("", html)
    clean = _STYLE_RE.sub("", clean)
    clean = _NAV_RE.sub("", clean)
    clean = _FOOTER_RE.sub("", clean)
    clean = _HEADER_RE.sub("", clean)
    clean = _TAG_RE.sub(" ", clean)
    clean = clean.replace("&nbsp;", " ")
    clean = clean.replace("&amp;", "&")
    clean = clean.replace("&lt;", "<")
    clean = clean.replace("&gt;", ">")
    clean = clean.replace("&quot;", '"')
    clean = _WHITESPACE_RE.sub(" ", clean).strip()
    return clean[:MAX_CONTEXT_CHARS]


# Ported verbatim from the original `api/context.js` (provider-agnostic —
# describes the task, not the model). Kept in Spanish like the rest of this
# codebase's system prompts (see orchestrator.py's LANGUAGE_DIRECTIVE comment
# on directors always being briefed in Spanish); English output is handled
# by appending LANGUAGE_DIRECTIVE to the user prompt, same as /coach.
SUMMARY_SYSTEM_PROMPT = """Eres un asistente especializado en extraer y resumir información relevante para la toma de decisiones empresariales.
Tu tarea: analizar el contenido proporcionado y extraer un briefing ejecutivo conciso (máximo 400 palabras) con:
1. De qué trata el documento/URL/nota
2. Datos y hechos clave relevantes para decisiones de negocio
3. Contexto importante que una junta directiva debería conocer
Sé directo y específico. Solo incluye información realmente relevante."""
