import { callAI, parseJsonSafely } from "@/lib/ai-service";
export const callGroq = callAI;
export const parseJsonFromResponse = parseJsonSafely;
export async function generateVerdict(channel: { title: string; subscriberCount: number; recentVideos: { title: string; viewCount: number }[] }): Promise<string> {
  return callAI(
    "YouTube growth expert. ONE specific insight, 2 sentences max. Be direct.",
    `${channel.title}, ${channel.subscriberCount} subs. Videos: ${channel.recentVideos.slice(0,5).map(v=>`"${v.title}" (${v.viewCount})`).join(", ")}` 
  );
}
