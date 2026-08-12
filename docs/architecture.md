# Architecture

The submitted visual architecture diagram is also available as
[`output/pdf/junta-directiva-architecture.pdf`](../output/pdf/junta-directiva-architecture.pdf).

**Junta Directiva AI** is a Collaborative Partner that keeps working after the
browser receives its answer: a board session is created immediately, then the
selected specialist agents work asynchronously in bounded parallel batches in
Google Cloud. The user watches live activity and completed contributions appear
in real time.

## Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Firebase Hosting (React)
    participant BE as Cloud Run (FastAPI)
    participant FS as Firestore
    participant ADK as Google ADK
    participant G as Gemini 3.5 Flash (Vertex AI)

    U->>FE: Describe situation and choose directors
    FE->>BE: POST /sessions
    BE->>FS: Create session document
    BE-->>FE: session_id immediately
    Note over BE,ADK: Background job continues independently of the browser
    loop Selected directors, parallel batches of up to 3
        BE->>ADK: Run director agent
        ADK->>G: Generate analysis
        G-->>ADK: Response
        ADK-->>BE: Director contribution
        BE->>FS: Append completed turn
    end
    BE->>ADK: Run focused contrast round
    ADK-->>BE: Cross-check findings
    BE->>ADK: Run Chairman synthesis
    ADK->>G: Generate verdict
    BE->>FS: Save verdict and mark done
    FE->>FS: Firestore onSnapshot subscription
    FS-->>FE: Live turns, status, and verdict
```

## Components

- **Firebase Hosting frontend** — React/Vite gathers the situation, optional
  document/URL/note context, meeting type, and director selection. It creates
  one session then subscribes to Firestore; it never calls Gemini directly.
- **Cloud Run backend** — FastAPI exposes `POST /sessions`, `/context`, and
  `/coach`. Every AI request uses the Cloud Run service account; the experience
  is free and unrestricted for judging, with no API-key or payment flow.
- **Google ADK + Vertex AI** — 12 director agents, the Chairman, document
  summaries, full reports, and follow-up questions all use `gemini-3.5-flash`
  through Vertex AI.
- **Firestore** — persists sessions, director activity states, completed turns,
  verdicts, and pause state. The live subscription keeps the interface updated
  while work happens in the background.

## Hackathon compliance

| Requirement | Implementation |
|---|---|
| Gemini 3.5+ | `gemini-3.5-flash` via Vertex AI |
| Google agent framework | Google ADK agents + `InMemoryRunner` |
| Google Cloud services | Cloud Run, Firestore, Firebase Hosting |
| Beyond a chat loop | `POST /sessions` returns first; parallel board work continues server-side and persists live progress |
| Collaborative Partner | Clarifying context, guided decision flow, director selection, a follow-up Chairman conversation with attachments, and a full PDF report |
