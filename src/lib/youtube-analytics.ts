import { getToken } from "@/lib/youtube-auth";

const BASE = "https://youtubeanalytics.googleapis.com/v2";

export interface VideoPrivateStats {
  videoId: string;
  impressions: number;
  ctr: number;
  avgViewDuration: number;
  avgViewPercent: number;
  subscribersGained: number;
}

export interface ChannelPrivateStats {
  totalImpressions: number;
  avgCTR: number;
  avgViewDuration: number;
  subscriberGrowth: number;
}

async function get(url: string): Promise<any> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem("yt_full_connect");
    throw new Error("Token expired — please reconnect");
  }
  if (!res.ok) throw new Error(`Analytics error: ${res.status}`);
  return res.json();
}

export async function getChannelPrivateStats(channelId: string): Promise<ChannelPrivateStats | null> {
  try {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const data = await get(
      `${BASE}/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=impressions,impressionClickThroughRate,averageViewDuration,subscribersGained` 
    );
    const row = data.rows?.[0];
    if (!row) return null;
    return {
      totalImpressions: row[0] || 0,
      avgCTR: row[1] || 0,
      avgViewDuration: row[2] || 0,
      subscriberGrowth: row[3] || 0,
    };
  } catch (e) {
    console.warn("[Analytics]", e);
    return null;
  }
}

export async function getVideoPrivateStats(videoId: string, channelId: string): Promise<VideoPrivateStats | null> {
  try {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const data = await get(
      `${BASE}/reports?ids=channel==${channelId}&startDate=${start}&endDate=${end}&metrics=impressions,impressionClickThroughRate,averageViewDuration,averageViewPercentage,subscribersGained&dimensions=video&filters=video==${videoId}` 
    );
    const row = data.rows?.[0];
    if (!row) return null;
    return {
      videoId,
      impressions: row[0] || 0,
      ctr: row[1] || 0,
      avgViewDuration: row[2] || 0,
      avgViewPercent: row[3] || 0,
      subscribersGained: row[4] || 0,
    };
  } catch (e) {
    console.warn("[Analytics]", e);
    return null;
  }
}

export function isFullyConnected(): boolean {
  return localStorage.getItem("yt_full_connect") === "true";
}
