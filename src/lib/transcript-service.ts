export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  fullText: string;
  available: boolean;
}

export async function getVideoTranscript(videoId: string): Promise<TranscriptResult> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    const html = await res.text();
    const match = html.match(/"captionTracks":(\[.*?\])/);
    if (!match) return { segments: [], fullText: "", available: false };

    const tracks = JSON.parse(match[1]);
    const track =
      tracks.find((t: any) => t.languageCode === "en" || t.languageCode === "en-US") ||
      tracks[0];
    if (!track?.baseUrl) return { segments: [], fullText: "", available: false };

    const capRes = await fetch(track.baseUrl);
    const xml = await capRes.text();
    const segments: TranscriptSegment[] = [];
    const rx = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = rx.exec(xml)) !== null) {
      segments.push({
        start: parseFloat(m[1]),
        duration: parseFloat(m[2]),
        text: m[3]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/<[^>]+>/g, ""),
      });
    }
    return {
      segments,
      fullText: segments.map((s) => s.text).join(" "),
      available: segments.length > 0,
    };
  } catch {
    return { segments: [], fullText: "", available: false };
  }
}

export function formatTranscriptForAI(result: TranscriptResult, maxChars = 6000): string {
  if (!result.available || !result.segments.length) return "TRANSCRIPT: Not available for this video.";
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  let out = "TRANSCRIPT:\n";
  let chars = 0;
  for (const seg of result.segments) {
    const line = `[${fmt(seg.start)}] ${seg.text}\n`;
    if (chars + line.length > maxChars) break;
    out += line;
    chars += line.length;
  }
  return out;
}
