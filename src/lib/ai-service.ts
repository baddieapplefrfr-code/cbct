const OR_KEY = "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";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

// Verified working models — primary first, free fallbacks after
const MODELS = [
  "anthropic/claude-3-haiku",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.3-8b-instruct:free",
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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

async function tryModel(model: string, sys: string, user: string, maxTokens: number, temp: number): Promise<string | null> {
  try {
    const res = await withTimeout(fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OR_KEY}`,
        "HTTP-Referer": "https://creatorteam.netlify.app",
        "X-Title": "CreatorBrain",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        max_tokens: maxTokens,
        temperature: temp,
      }),
    }), 18000);
    if (!res || !res.ok) { console.warn(`[AI] ${model} → ${res?.status}`); return null; }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" && content.length > 0 ? content : null;
  } catch (e) { console.warn(`[AI] ${model} error:`, e); return null; }
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

  for (let i = 0; i < MODELS.length; i++) {
    if (i === 2) setStatus("slow");
    const r = await tryModel(MODELS[i], systemPrompt, userPrompt, maxTokens, temperature);
    if (r) { setStatus("ok"); cache.set(cacheKey, { result: r, ts: Date.now() }); return r; }
  }
  setStatus("limited");
  return "AI is briefly unavailable. Please click Try Again in a few seconds.";
}

export async function streamAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  for (const model of MODELS.slice(0, 3)) {
    try {
      const res = await withTimeout(fetch(OR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OR_KEY}`,
          "HTTP-Referer": "https://creatorteam.netlify.app",
          "X-Title": "CreatorBrain",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          max_tokens: 2000,
          temperature: 0.7,
          stream: true,
        }),
      }), 25000);
      if (!res || !res.ok || !res.body) continue;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "", buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try { const c = JSON.parse(json).choices?.[0]?.delta?.content; if (c) { full += c; onChunk(c); } } catch {}
        }
      }
      if (full.length > 10) { setStatus("ok"); return full; }
    } catch { continue; }
  }
  const fallback = await callAI(systemPrompt, userPrompt);
  onChunk(fallback);
  return fallback;
}

export function parseJsonSafely(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const s = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(s); } catch {}
  const obj = s.match(/\{[\s\S]*\}/); if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  const arr = s.match(/\[[\s\S]*\]/); if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  return null;
}
export const parseJsonFromAI = parseJsonSafely;
export const parseJsonFromResponse = parseJsonSafely;
export default callAI;
