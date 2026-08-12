# Junta Directiva AI

12 AI board-of-directors agents challenge a business decision, connect their findings, and issue an executive verdict with practical next steps — built for the **All Things Agentic Hackathon**, Collaborative Partner track.

You describe a business situation (up to 2,000 characters), choose a meeting type, optionally add source material, and select the directors you need. The 12 specialist personas cover Strategy, Finance, Marketing, Operations, Legal, Technology, Sales, Product, People, Data, Chairman/Mentor, and a Chief Reality Officer who says the uncomfortable part out loud. A Chairman agent closes the board session with consensus points, the main disagreement, a final verdict, and prioritized next steps.

**Live demo:** https://junta-directiva-hackathon.web.app · **API:** https://junta-backend-923278368829.us-central1.run.app

## Why this counts as "beyond the standard chat loop"

`POST /sessions` returns a `session_id` immediately. The board then runs as a FastAPI `BackgroundTasks` job on the server, independent of whether the browser tab stays open, writing each result to Firestore. Directors work in bounded parallel batches, followed by a focused contrast round and Chairman synthesis. For this board-convening flow — the flow that satisfies the hackathon's async/GCP requirements — the frontend never calls Gemini directly: it only subscribes to the Firestore session document (`onSnapshot`) and renders live activity, findings, and the verdict as they land. See [`docs/architecture.md`](docs/architecture.md) for the full sequence diagram.

## Features

- **12 director personas + a Chairman** challenge a business situation and converge on concrete options and a recommendation — not a cold up/down verdict.
- **Director selection** — convene the full board or just the directors relevant to your situation.
- **Live parallel deliberation** — director status is visible while analyses arrive in parallel; the board then cross-checks its first findings before the Chairman synthesizes them.
- **Full operational report, free** — the former premium plan is included in the hackathon build: a 30/60/90 roadmap, prioritized actions, owners and effort, KPIs, contingencies, and decision scenarios, downloadable as a polished executive PDF.
- **Additional context panel** — attach a PDF, Word doc, Markdown file, URL, or free-text notes; the backend summarizes it via `/context` before the debate starts. A prepared context source can also be used as the situation by itself.
- **Chairman working session** — after the verdict, users can rebut, explore alternatives, reconduct the decision, or add an image, PDF, Markdown, or text file. Each refined response can be saved as a styled PDF.
- **Pause / resume** an in-progress debate — nothing already generated is lost, the orchestrator polls a Firestore flag between turns.
- **Decision-ready intake** — up to 2,000 characters for the initial brief, plus source-based context, so a real decision does not need to fit into a chat-sized prompt.
- **Free judging access**: all features are available without payment, API keys, sign-up, or a usage cap, so judges can test the complete experience.
- **Bilingual (ES/EN)** throughout, including per-director bios, meeting copy, product messaging, and legal/responsible-use notice.

## Stack

- **Gemini** (`gemini-3.5-flash`) via **Vertex AI** — called only from the backend, using the Cloud Run service account's credentials (Application Default Credentials). No API key is ever exposed to the browser.
- **Google ADK** (`google-adk`) for agent orchestration — 12 director agents + 1 chairman-synthesis agent, each an ADK `Agent` run through `google.adk.runners.InMemoryRunner`.
- **Cloud Run** (backend, FastAPI) + **Firestore** (session state, Native mode) — the two GCP infra services this entry uses.
- **React 18 + Vite** frontend, deployed to **Firebase Hosting**.

## Competition build vs. the underlying product

The underlying product ("Junta Directiva AI", [juntadirectiva.vercel.app](https://juntadirectiva.vercel.app)) supports multiple AI providers (Claude/OpenAI/Gemini) with client-side, provider-agnostic API keys. This hackathon entry intentionally narrows the stack to comply with contest rules while restoring full feature parity:

- **Gemini-only**, called server-side via Vertex AI — no provider picker, BYOK path, or API-key UI.
- Every other product feature (director selection, full PDF report, attachment-aware Chairman chat, additional context, pause/resume, and live board activity) has been ported to this async, ADK-orchestrated architecture rather than dropped.

## Status of this repo

Deployed and live (see links above), end-to-end smoke-tested against real Vertex AI + Firestore. Frontend and backend test suites pass locally (backend tests mock agent calls / use a Firestore emulator; frontend tests mock Firestore). The spin-up instructions below are for running the stack against your **own** GCP project and credentials.

## Run locally

### Prerequisites

- A GCP project with the Vertex AI API, Firestore API, and a Firestore database (Native mode) enabled.
- A service account (or your own `gcloud auth application-default login` credentials) with `roles/aiplatform.user` and `roles/datastore.user` on that project.
- A Firebase project (can be the same GCP project) with a Web app registered, for the frontend's Firestore SDK config.
- Python 3.12, Node.js 18+.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
export GOOGLE_CLOUD_PROJECT=your-gcp-project-id
uvicorn main:app --reload --port 8080
```

Run the test suite (mocks the ADK/Gemini calls, so it doesn't hit Vertex AI):

```bash
python -m pytest -v
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (not committed) with:

```
VITE_BACKEND_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_PROJECT_ID=your-gcp-project-id
```

Then:

```bash
npm run dev
```

The frontend only needs these three environment variables. There is no client-side Gemini/AI API key: all model calls happen on the backend through Vertex AI and the Cloud Run service account.

For local backend development, set `GOOGLE_CLOUD_LOCATION=global`; Gemini 3.5 Flash is served through Vertex AI's global endpoint.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full sequence diagram and a breakdown of each component (frontend, backend, orchestrator, ADK agents, Firestore).

## Compliance checklist (hackathon rules)

- [x] Gemini 3.5+ called via Vertex AI (`gemini-3.5-flash`, `backend/agents/directors.py` + `chairman.py`), visible in code
- [x] Google ADK used for agent orchestration (`google.adk.Agent` + `InMemoryRunner`), visible in code and in the architecture diagram
- [x] Cloud Run + Firestore both provisioned and verified live — backend at https://junta-backend-923278368829.us-central1.run.app, frontend at https://junta-directiva-hackathon.web.app, end-to-end smoke-tested with real Vertex AI + Firestore (still needs to be **shown in the demo video**)
- [x] Repo shared with `testing@devpost.com` + `cloudhackathons@google.com`
- [x] README has spin-up instructions a stranger could follow (this file)
- [x] Architecture diagram included in repo (`docs/architecture.md`)
- [ ] Devpost submission has: hosted URL, text description, repo link, video — pending
- [ ] Submitted before Aug 31, 2026, 17:00 PDT — pending

## License

Not yet specified.
