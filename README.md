# Junta Directiva AI

12 AI board-of-directors agents debate your situation with each other and issue an executive verdict with next steps — built for the **All Things Agentic Hackathon**, Collaborative Partner track.

You describe a business situation and pick a meeting type; 12 specialized director agents (Strategy, Finance, Marketing, Operations, Legal, Technology, Sales, Product, People, Data, Chairman/Mentor, and a "Chief Reality Officer" that says the uncomfortable part out loud) each weigh in, and a Chairman agent closes the debate with consensus points, the main disagreement, a final verdict, and prioritized next steps.

**Live demo:** https://junta-directiva-hackathon.web.app · **API:** https://junta-backend-923278368829.us-central1.run.app

## Why this counts as "beyond the standard chat loop"

`POST /sessions` returns a `session_id` immediately. The 12-director-plus-chairman debate then runs as a FastAPI `BackgroundTasks` job on the server, independent of whether the browser tab stays open, writing each turn to Firestore as it completes. For this board-convening/debate flow — the flow that satisfies the hackathon's async/GCP requirements — the frontend never calls Gemini directly: it only subscribes to the Firestore session document (`onSnapshot`) and renders turns and the verdict as they land. See [`docs/architecture.md`](docs/architecture.md) for the full sequence diagram.

## Features

- **12 director personas + a Chairman** debate a business situation and converge on concrete options and a recommendation — not a cold up/down verdict.
- **Director selection** — convene the full board or just the directors relevant to your situation.
- **Full report generation** and a **follow-up chat with the Chairman** after the debate closes, via a lightweight `/coach` endpoint.
- **Additional context panel** — attach a PDF, Word doc, URL, or free-text notes; the backend summarizes it via `/context` before the debate starts.
- **Pause / resume** an in-progress debate — nothing already generated is lost, the orchestrator polls a Firestore flag between turns.
- **Live "thinking" indicator** for whichever director is currently being generated.
- **Cost protection**: a 3-requests-per-day-per-IP free tier (shared across `/sessions`, `/coach`, `/context`), with an optional bring-your-own-Gemini-API-key bypass for unlimited use — billed to the user's own Google account, not the project owner's.
- **Bilingual (ES/EN)** throughout, including per-director bios and meeting-type copy.

## Stack

- **Gemini** (`gemini-2.5-flash`) via **Vertex AI** — called only from the backend, using the Cloud Run service account's credentials (Application Default Credentials). No API key is ever exposed to the browser.
- **Google ADK** (`google-adk`) for agent orchestration — 12 director agents + 1 chairman-synthesis agent, each an ADK `Agent` run through `google.adk.runners.InMemoryRunner`.
- **Cloud Run** (backend, FastAPI) + **Firestore** (session state, Native mode) — the two GCP infra services this entry uses.
- **React 18 + Vite** frontend, deployed to **Firebase Hosting**.

## Competition build vs. the underlying product

The underlying product ("Junta Directiva AI", [juntadirectiva.vercel.app](https://juntadirectiva.vercel.app)) supports multiple AI providers (Claude/OpenAI/Gemini) with client-side, provider-agnostic API keys. This hackathon entry intentionally narrows the stack to comply with contest rules while restoring full feature parity:

- **Gemini-only**, called server-side via Vertex AI by default — no provider picker. The optional BYOK bypass (above) is also Gemini-only, by design, to keep the judged surface unambiguous.
- Every other product feature (director selection, full report, chairman chat, additional context, pause/resume) has been ported to this async, ADK-orchestrated architecture rather than dropped.

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

The frontend only ever needs these three environment variables. By default there is no client-side Gemini/AI API key — all model calls happen from the backend via Vertex AI. A user can optionally paste their own Gemini API key in the settings modal to bypass the 3/day free-tier limit; that key is only ever sent to the backend per-request, never stored server-side, and calls made with it bill the user's own Google account, not the project owner's.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full sequence diagram and a breakdown of each component (frontend, backend, orchestrator, ADK agents, Firestore).

## Compliance checklist (hackathon rules)

- [x] Gemini called via Vertex AI (`gemini-2.5-flash`, `backend/agents/directors.py` + `chairman.py`), visible in code
- [x] Google ADK used for agent orchestration (`google.adk.Agent` + `InMemoryRunner`), visible in code and in the architecture diagram
- [x] Cloud Run + Firestore both provisioned and verified live — backend at https://junta-backend-923278368829.us-central1.run.app, frontend at https://junta-directiva-hackathon.web.app, end-to-end smoke-tested with real Vertex AI + Firestore (still needs to be **shown in the demo video**)
- [x] Repo shared with `testing@devpost.com` + `cloudhackathons@google.com`
- [x] README has spin-up instructions a stranger could follow (this file)
- [x] Architecture diagram included in repo (`docs/architecture.md`)
- [ ] Devpost submission has: hosted URL, text description, repo link, video — pending
- [ ] Submitted before Aug 31, 2026, 17:00 PDT — pending

## License

Not yet specified.
