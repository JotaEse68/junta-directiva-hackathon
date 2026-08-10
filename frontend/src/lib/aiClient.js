// COMPETITION BUILD: Gemini-only via backend proxy
// Production version (at github.com/JotaEse68/juntadirectiva) supports multiple providers (Claude, OpenAI, Gemini)
// This build intentionally narrows to comply with contest rules.

// Gemini always uses backend proxy (/api/gemini) because it blocks CORS
function buildRequest({ apiKey, system, userMsg, maxTokens }) {
  const model = 'gemini-flash-latest'
  return {
    endpoint: '/api/gemini',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, model, system, userPrompt: userMsg, maxTokens }),
  }
}

// Extract text delta from Gemini SSE event
function extractDelta(parsed) {
  return parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Generic streaming call. No apiKey (free mode) always goes through /api/coach with backend-provided key
export async function streamCompletion({ apiKey, system, userMsg, maxTokens, onChunk }) {
  const req = apiKey
    ? buildRequest({ apiKey, system, userMsg, maxTokens })
    : { endpoint: '/api/coach', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemPrompt: system, userPrompt: userMsg, maxTokens }) }

  const res = await fetch(req.endpoint, { method: 'POST', headers: req.headers, body: req.body })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Error ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = extractDelta(parsed)
        if (delta) {
          fullText += delta
          onChunk?.(fullText)
        }
      } catch { /* skip */ }
    }
  }
  return fullText
}
