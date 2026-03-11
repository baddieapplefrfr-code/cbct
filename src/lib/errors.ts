export const friendlyError = (err: any): string => {
  const msg = err?.message || String(err) || "";
  if (msg.includes("quota")) return "YouTube's daily limit hit. Try again tomorrow — it resets at midnight PT.";
  if (msg.includes("not found") || msg.includes("404")) return "Channel not found. Try their exact @handle — e.g. @mkbhd";
  if (msg.includes("network") || msg.includes("fetch")) return "Connection issue. Check your internet and try again.";
  if (msg.includes("parse") || msg.includes("JSON")) return "AI returned unexpected data. Hit try again — it usually works second time.";
  if (msg.includes("403")) return "Access denied. This channel may have restricted their data.";
  if (msg.includes("AI") || msg.includes("groq") || msg.includes("openrouter")) return "AI is taking a breath. Try again in 10 seconds.";
  return "Something went sideways. Try again and it'll probably work.";
};
