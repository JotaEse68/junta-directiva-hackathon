"""In-memory, per-IP daily rate limiter (Task 20 — cost protection).

This app is public with no auth, and every AI-consuming request (a board
session, a coach/report call, a context summarization) is billed to the repo
owner's own GCP project via the Cloud Run service account. To cap that
exposure, each IP gets 3 AI-consuming requests per rolling 24h window, shared
across `POST /sessions`, `POST /coach`, and `POST /context` (main.py wires
`enforce_rate_limit` into all three) — matching the owner's own framing of
"3 consultas gratis al día". A request that supplies its own Gemini API key
bypasses this entirely (see `orchestrator.call_agent_with_key`): that call is
billed to the *user's* Google account, not the owner's, so there is nothing
to protect against.

Deliberately simple for a hackathon build: an in-process dict, not persisted,
not shared across Cloud Run instances or survived across a restart/redeploy.
A user could get more than 3/day by hitting a fresh instance, and the count
resets on every deploy. Acceptable here — the goal is blunting casual/bot
traffic from blowing up the bill, not perfect enforcement. A production
version would back this with Firestore or Redis (same tradeoff already
accepted for `firestore_store.py`'s `paused` polling, see orchestrator.py).
"""

import time
from collections import defaultdict

_WINDOW_SECONDS = 24 * 60 * 60
MAX_REQUESTS_PER_WINDOW = 3

# ip -> list of unix timestamps of requests within the current rolling window.
_requests: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request) -> str:
    """Resolve the client IP the same way the original Vercel functions did:
    `X-Forwarded-For` first (Cloud Run sits behind Google's load balancer,
    which sets this on every request), falling back to the raw connection IP
    for local/direct-connection cases (e.g. tests, `TestClient`).
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_and_increment(ip: str) -> bool:
    """Rolling 24h window: prunes timestamps older than the window on every
    call (so the limit self-resets without a cron job), then checks whether
    this IP is already at the cap.

    Returns True and records the request if allowed; returns False (and does
    NOT record it, since it never happened) if the IP is already at
    `MAX_REQUESTS_PER_WINDOW` within the window.
    """
    now = time.time()
    cutoff = now - _WINDOW_SECONDS
    fresh = [t for t in _requests[ip] if t > cutoff]

    if len(fresh) >= MAX_REQUESTS_PER_WINDOW:
        _requests[ip] = fresh
        return False

    fresh.append(now)
    _requests[ip] = fresh
    return True
