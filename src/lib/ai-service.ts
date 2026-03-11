// ── AI Service — OllamaFreeAPI (no key needed) + OpenRouter fallback ──
const OLLAMA_URL = "https://ollama.freeapi.org/api/chat";
const OR_KEY = "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";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const OR_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${OR_KEY}`,
  "HTTP-Referer": "https://creatorbrain.app",
  "X-Title": "CreatorBrain",
};

const OLLAMA_MODELS = [
  "llama3.2",
  "llama3.1",
  "mistral",
  "gemma2",
  "qwen2.5",
];

const OR_MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3-12b-it:free",
];

type AIStatus = "ok" | "slow" | "limited";
let aiStatus: AIStatus = "ok";
const listeners = new Set<(s: AIStatus) => void>();
export function getAIStatus() { return aiStatus; }
export function onAIStatusChange(fn: (s: AIStatus) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(s: AIStatus) { aiStatus = s; listeners.forEach(fn => fn(s)); }

const cache = new Map<string, { result: string; ts: number }>();
const CACHE_MS = 45_000;

async function tryOllama(model: string, sys: string, user: string, maxTokens: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ],
        stream: false,
        options: { num_predict: maxTokens }
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    try {
      const data = JSON.parse(text);
      return data.message?.content ?? null;
    } catch {
      return null;
    }
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function tryOpenRouter(model: string, sys: string, user: string, maxTokens: number, temp: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(OR_URL, {
      method: "POST",
      headers: OR_HEADERS,
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        max_tokens: maxTokens,
        temperature: temp,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status === 429 || res.status === 503 || !res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const { maxTokens = 2000, temperature = 0.7 } = options ?? {};
  const cacheKey = (systemPrompt + userPrompt).slice(0, 200);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.result;

  // Try OllamaFreeAPI first (no key needed, free)
  for (let i = 0; i < OLLAMA_MODELS.length; i++) {
    if (i === 2) setStatus("slow");
    const r = await tryOllama(OLLAMA_MODELS[i], systemPrompt, userPrompt, maxTokens);
    if (r) {
      setStatus("ok");
      cache.set(cacheKey, { result: r, ts: Date.now() });
      return r;
    }
  }

  // Fallback to OpenRouter
  for (const model of OR_MODELS) {
    const r = await tryOpenRouter(model, systemPrompt, userPrompt, maxTokens, temperature);
    if (r) {
      setStatus("ok");
      cache.set(cacheKey, { result: r, ts: Date.now() });
      return r;
    }
  }

  setStatus("limited");
  return "AI is briefly resting. Your channel data loaded — please click Try Again in a few seconds.";
}

export async function streamAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  // Use non-streaming callAI and simulate streaming for reliability
  const result = await callAI(systemPrompt, userPrompt);
  // Simulate streaming by chunking the response
  const words = result.split(" ");
  let full = "";
  for (const word of words) {
    const chunk = word + " ";
    full += chunk;
    onChunk(chunk);
    await new Promise(r => setTimeout(r, 15));
  }
  return full.trim();
}

export function parseJsonSafely(text: string): any {
  if (!text) return null;
  
  // Clean markdown fences
  let s = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  
  // Try direct parse
  try { return JSON.parse(s); } catch {}
  
  // Try to extract and auto-close incomplete JSON object
  const objStart = s.indexOf("{");
  if (objStart !== -1) {
    let snippet = s.slice(objStart);
    // Count braces to detect truncation
    let open = 0;
    let lastValid = 0;
    for (let i = 0; i < snippet.length; i++) {
      if (snippet[i] === "{") open++;
      if (snippet[i] === "}") { open--; if (open === 0) { lastValid = i; break; } }
    }
    if (lastValid > 0) {
      try { return JSON.parse(snippet.slice(0, lastValid + 1)); } catch {}
    }
    // Force-close unclosed JSON
    while (open > 0) { snippet += "}"; open--; }
    try { return JSON.parse(snippet); } catch {}
  }

  // Try array extraction
  const arrStart = s.indexOf("[");
  if (arrStart !== -1) {
    let snippet = s.slice(arrStart);
    let open = 0;
    for (let i = 0; i < snippet.length; i++) {
      if (snippet[i] === "[") open++;
      if (snippet[i] === "]") { open--; if (open === 0) { try { return JSON.parse(snippet.slice(0, i + 1)); } catch {} break; } }
    }
    while (open > 0) { snippet += "]"; open--; }
    try { return JSON.parse(snippet); } catch {}
  }

  return null;
}

export const parseJsonFromAI = parseJsonSafely;
export const parseJsonFromResponse = parseJsonSafely;
export const callGroq = callAI;
export default callAI;
