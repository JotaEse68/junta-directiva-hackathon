# Junta Directiva AI — Competition Build

## About

**Junta Directiva AI** is an AI-powered board of directors simulator. You describe a business situation, and 12 AI experts from different disciplines debate it among themselves, then deliver an executive verdict with actionable next steps.

This competition build is powered by **Google Gemini** exclusively.

## Competition Build vs. Production

The **production version** (at [github.com/JotaEse68/juntadirectiva](https://github.com/JotaEse68/juntadirectiva)) supports multiple AI providers:
- Claude (Anthropic) — direct browser calls
- OpenAI — via proxy to avoid CORS
- Gemini (Google) — via proxy to avoid CORS

This **competition repository** intentionally narrows to **Gemini-only** to comply with contest rules. The frontend UI has been simplified:
- No multi-provider selector
- Single Gemini API key input (or free mode via server-provided key)
- Simplified settings and storage logic

## Tech Stack

- **Frontend:** React + Vite
- **AI Model:** Google Gemini (via backend proxy for CORS handling)
- **Styling:** CSS Grid, CSS variables

## Getting Started

### Install Dependencies

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

The production version at the original repo supports a full multi-provider experience with persistent provider selection and per-provider API key management.
