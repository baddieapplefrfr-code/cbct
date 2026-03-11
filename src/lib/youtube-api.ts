const YT_API_KEY = "AIzaSyAz-3Zhkq7DaeodW4s_2zTXW_zHvtzqXzc";

export interface ChannelData {
  id: string;
  name: string;
  title?: string; // Alias for name (backward compat)
  handle: string;
  description: string;
  avatar: string;
  banner: string | null;
  subscribers: number;
  subscriberCount?: number; // Alias for subscribers (backward compat)
  totalViews: number;
  viewCount?: number; // Alias for totalViews (backward compat)
  videoCount: number;
  createdAt: string;
  country: string;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  bestDay: string;
  avgDaysBetweenUploads: number;
  uploadFrequency: string;
  videos: VideoData[];
  comments: Record<string, CommentData[]>;
  fetchedAt: string;
  isPublicData: boolean;
}

export interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  views: number;
  viewCount?: number; // Alias
  likes: number;
  likeCount?: number; // Alias
  comments: number;
  commentCount?: number; // Alias
  tags: string[];
  categoryId: string;
  defaultLanguage?: string;
  isShort: boolean;
}

export interface CommentData {
  id: string;
  text: string;
  likes: number;
  author: string;
  authorAvatar: string;
  publishedAt: string;
  replyCount: number;
}

export type FetchProgress = {
  step: "finding" | "videos" | "comments" | "insights" | "done";
  message: string;
  channelName?: string;
  videoCount?: number;
  percent: number;
};

export async function fetchCompleteChannelData(
  input: string,
  onProgress?: (progress: FetchProgress) => void
): Promise<ChannelData> {
  if (!input || input.trim() === "") {
    throw new Error("Please enter a valid YouTube channel URL or @handle");
  }
  
  let cleaned = input
    .trim()
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "")
    .replace("youtube.com/", "")
    .replace("youtu.be/", "");

  let handle = "";
  let channelId = "";

  if (cleaned.startsWith("@")) {
    handle = cleaned.split("/")[0].split("?")[0];
  } else if (cleaned.startsWith("channel/")) {
    channelId = cleaned.replace("channel/", "").split("/")[0].split("?")[0];
  } else if (cleaned.startsWith("c/")) {
    handle = cleaned.replace("c/", "").split("/")[0].split("?")[0];
  } else if (cleaned.includes("@")) {
    handle = "@" + cleaned.split("@")[1].split("/")[0].split("?")[0];
  } else {
    handle = cleaned.split("/")[0].split("?")[0];
  }

  onProgress?.({ step: "finding", message: "Finding your channel...", percent: 5 });

  let channelData: any = null;

  // Try handle-based fetch first
  if (handle) {
    const handleToTry = handle.startsWith("@") ? handle.substring(1) : handle;
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&forHandle=${handleToTry}&key=${YT_API_KEY}`
      );
      const text = await res.text();
      if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
      if (data.error?.code === 403) {
        throw new Error("API quota exceeded. Please try again tomorrow.");
      }
      channelData = data.items?.[0] || null;
    } catch (err: any) {
      if (err.message?.includes("quota")) throw err;
      // Continue to next method
    }
    // Always advance progress even on failure
    if (!channelData) {
      onProgress?.({ step: "finding", message: "Searching for channel...", percent: 8 });
    }
  }

  // Try channel ID fetch
  if (!channelData && channelId) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelId}&key=${YT_API_KEY}`
      );
      const text = await res.text();
      if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
      if (data.error?.code === 403) {
        throw new Error("API quota exceeded. Please try again tomorrow.");
      }
      channelData = data.items?.[0] || null;
    } catch (err: any) {
      if (err.message?.includes("quota")) throw err;
    }
    if (!channelData) {
      onProgress?.({ step: "finding", message: "Searching by name...", percent: 10 });
    }
  }

  // Try search as last resort
  if (!channelData && handle) {
    onProgress?.({ step: "finding", message: "Searching YouTube...", percent: 12 });
    const searchHandle = handle.replace("@", "");
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${searchHandle}&key=${YT_API_KEY}`
      );
      const text = await res.text();
      if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
      if (data.error?.code === 403) {
        throw new Error("API quota exceeded. Please try again tomorrow.");
      }
      const firstResult = data.items?.[0];
      if (firstResult) {
        channelId = firstResult.snippet.channelId;
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${channelId}&key=${YT_API_KEY}`
        );
        const channelText = await channelRes.text();
        if (!channelText || channelText.trim() === "") throw new Error("Empty response from YouTube API");
        let channelDataRes: any;
        try { channelDataRes = JSON.parse(channelText); } catch { throw new Error("Invalid response from YouTube API"); }
        channelData = channelDataRes.items?.[0] || null;
      }
    } catch (err: any) {
      if (err.message?.includes("quota")) throw err;
    }
  }

  if (!channelData) {
    throw new Error("Channel not found. Try using the format: youtube.com/@yourhandle");
  }

  channelId = channelData.id;
  const channelName = channelData.snippet.title;
  const uploadsPlaylistId = channelData.contentDetails?.relatedPlaylists?.uploads;

  onProgress?.({
    step: "finding",
    message: `Found — ${channelName}`,
    channelName,
    percent: 15,
  });

  if (!uploadsPlaylistId) {
    throw new Error("Could not access this channel's videos");
  }

  onProgress?.({ step: "videos", message: "Loading videos...", channelName, percent: 20 });

  let allVideoIds: string[] = [];
  let nextPageToken = "";

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YT_API_KEY}${nextPageToken ? "&pageToken=" + nextPageToken : ""}`;
    const res = await fetch(url);
    const text = await res.text();
    if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }

    if (data.error) break;

    allVideoIds = [
      ...allVideoIds,
      ...(data.items || []).map((i: any) => i.contentDetails.videoId),
    ];
    nextPageToken = data.nextPageToken || "";

    onProgress?.({
      step: "videos",
      message: `Loading ${allVideoIds.length} videos...`,
      channelName,
      videoCount: allVideoIds.length,
      percent: 20 + Math.min(allVideoIds.length / 200, 1) * 25,
    });
  } while (nextPageToken && allVideoIds.length < 200);

  let allVideos: any[] = [];
  for (let i = 0; i < allVideoIds.length; i += 50) {
    const batch = allVideoIds.slice(i, i + 50).join(",");
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch}&key=${YT_API_KEY}`
    );
    const text = await res.text();
    if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
    allVideos = [...allVideos, ...(data.items || [])];

    onProgress?.({
      step: "videos",
      message: `Loaded ${allVideos.length} videos...`,
      channelName,
      videoCount: allVideos.length,
      percent: 45 + (i / allVideoIds.length) * 15,
    });
  }

  onProgress?.({
    step: "comments",
    message: "Reading comments...",
    channelName,
    videoCount: allVideos.length,
    percent: 60,
  });

  const recentVideos = allVideos.slice(0, 10);
  const commentsMap: Record<string, CommentData[]> = {};

  for (let idx = 0; idx < recentVideos.length; idx++) {
    const video = recentVideos[idx];
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${video.id}&maxResults=100&order=relevance&key=${YT_API_KEY}`
      );
      const text = await res.text();
      if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
      if (!data.error) {
        commentsMap[video.id] = (data.items || []).map((item: any) => ({
          id: item.id,
          text: item.snippet.topLevelComment.snippet.textDisplay,
          likes: item.snippet.topLevelComment.snippet.likeCount,
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          authorAvatar: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
          publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
          replyCount: item.snippet.totalReplyCount,
        }));
      }
    } catch {
      commentsMap[video.id] = [];
    }

    onProgress?.({
      step: "comments",
      message: `Reading comments... (${idx + 1}/${recentVideos.length})`,
      channelName,
      videoCount: allVideos.length,
      percent: 60 + ((idx + 1) / recentVideos.length) * 20,
    });
  }

  onProgress?.({
    step: "insights",
    message: "Building your insights...",
    channelName,
    videoCount: allVideos.length,
    percent: 85,
  });

  const avgViews =
    allVideos.length > 0
      ? Math.round(
          allVideos.reduce((sum, v) => sum + parseInt(v.statistics?.viewCount || 0), 0) /
            allVideos.length
        )
      : 0;

  const avgLikes =
    allVideos.length > 0
      ? Math.round(
          allVideos.reduce((sum, v) => sum + parseInt(v.statistics?.likeCount || 0), 0) /
            allVideos.length
        )
      : 0;

  const avgComments =
    allVideos.length > 0
      ? Math.round(
          allVideos.reduce((sum, v) => sum + parseInt(v.statistics?.commentCount || 0), 0) /
            allVideos.length
        )
      : 0;

  const sortedVideos = [...allVideos].sort(
    (a, b) => new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
  );

  const recentDates = sortedVideos.slice(0, 10).map((v) => new Date(v.snippet.publishedAt));
  let avgDaysBetweenUploads = 7;
  if (recentDates.length > 1) {
    const gaps = recentDates
      .slice(0, -1)
      .map((date, i) => (date.getTime() - recentDates[i + 1].getTime()) / (1000 * 60 * 60 * 24));
    avgDaysBetweenUploads = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }

  const dayPerformance: Record<string, { total: number; count: number }> = {};
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  allVideos.forEach((v) => {
    const day = days[new Date(v.snippet.publishedAt).getDay()];
    if (!dayPerformance[day]) dayPerformance[day] = { total: 0, count: 0 };
    dayPerformance[day].total += parseInt(v.statistics?.viewCount || 0);
    dayPerformance[day].count++;
  });
  const bestDay =
    Object.entries(dayPerformance)
      .map(([day, data]) => ({ day, avg: data.total / data.count }))
      .sort((a, b) => b.avg - a.avg)[0]?.day || "Wednesday";

  const subs = parseInt(channelData.statistics?.subscriberCount || 0);
  const totViews = parseInt(channelData.statistics?.viewCount || 0);
  const vidCount = parseInt(channelData.statistics?.videoCount || 0);

  const result: ChannelData = {
    id: channelId,
    name: channelName,
    title: channelName, // Alias
    handle: channelData.snippet.customUrl || handle,
    description: channelData.snippet.description,
    avatar:
      channelData.snippet.thumbnails?.high?.url ||
      channelData.snippet.thumbnails?.default?.url,
    banner: channelData.brandingSettings?.image?.bannerExternalUrl || null,
    subscribers: subs,
    subscriberCount: subs, // Alias
    totalViews: totViews,
    viewCount: totViews, // Alias
    videoCount: vidCount,
    createdAt: channelData.snippet.publishedAt,
    country: channelData.snippet.country || "Unknown",
    avgViews,
    avgLikes,
    avgComments,
    bestDay,
    avgDaysBetweenUploads,
    uploadFrequency:
      avgDaysBetweenUploads <= 3
        ? "Daily"
        : avgDaysBetweenUploads <= 7
          ? "Weekly"
          : avgDaysBetweenUploads <= 14
            ? "Bi-weekly"
            : "Monthly",
    videos: sortedVideos.map((v) => {
      const vw = parseInt(v.statistics?.viewCount || 0);
      const lk = parseInt(v.statistics?.likeCount || 0);
      const cm = parseInt(v.statistics?.commentCount || 0);
      return {
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description || "",
        thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url,
        publishedAt: v.snippet.publishedAt,
        duration: v.contentDetails?.duration || "PT0S",
        views: vw,
        viewCount: vw, // Alias
        likes: lk,
        likeCount: lk, // Alias
        comments: cm,
        commentCount: cm, // Alias
        tags: v.snippet.tags || [],
        categoryId: v.snippet.categoryId,
        defaultLanguage: v.snippet.defaultLanguage,
        isShort:
          vw > 0 &&
          (v.contentDetails?.duration || "").includes("PT") &&
          !v.contentDetails?.duration?.includes("H") &&
          parseInt(v.contentDetails?.duration?.replace(/[^0-9]/g, "") || "0") <= 60,
      };
    }),
    comments: commentsMap,
    fetchedAt: new Date().toISOString(),
    isPublicData: true,
  };

  localStorage.setItem("yt_channel_data", JSON.stringify(result));
  localStorage.setItem("channel_connected", "true");
  localStorage.setItem("channel_id", channelId);

  onProgress?.({
    step: "done",
    message: "Ready!",
    channelName,
    videoCount: allVideos.length,
    percent: 100,
  });

  return result;
}

// ── Backward-compatible functions (used by existing pages) ──────────
export async function getMyChannel(): Promise<ChannelData> {
  const stored = localStorage.getItem("yt_channel_data");
  if (!stored) throw new Error("No channel connected");
  return JSON.parse(stored);
}

export async function getRecentVideos(channelId: string, maxResults = 10): Promise<VideoData[]> {
  const stored = localStorage.getItem("yt_channel_data");
  if (!stored) return [];
  const data: ChannelData = JSON.parse(stored);
  return data.videos.slice(0, maxResults);
}

export async function getVideoComments(videoId: string, maxResults = 50): Promise<string[]> {
  const stored = localStorage.getItem("yt_channel_data");
  if (!stored) return [];
  const data: ChannelData = JSON.parse(stored);
  const comments = data.comments[videoId] || [];
  return comments.slice(0, maxResults).map(c => c.text);
}

// Two-argument version for backward compatibility
export function getChannelContext(channel: ChannelData, videos?: VideoData[]): string {
  const vids = videos || channel.videos;
  const videoSummary = vids
    .slice(0, 10)
    .map(
      (v) =>
        `"${v.title}" - ${v.views || v.viewCount} views, ${v.likes || v.likeCount} likes, ${v.comments || v.commentCount} comments, published ${v.publishedAt}`
    )
    .join("\n");

  return `Channel: ${channel.name || channel.title}
Subscribers: ${formatCount(channel.subscribers || channel.subscriberCount || 0)}
Total Views: ${formatCount(channel.totalViews || channel.viewCount || 0)}
Total Videos: ${channel.videoCount}
Average Views per Video: ${formatCount(channel.avgViews || 0)}
Upload Frequency: ${channel.uploadFrequency || 'Weekly'}
Best Performing Day: ${channel.bestDay || 'Wednesday'}

Recent Videos:
${videoSummary}`;
}

// ── Utility functions ───────────────────────────────────
export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function calcChannelScore(videos: VideoData[], subscriberCount: number): number {
  if (videos.length === 0) return 0;
  const avgViews = videos.reduce((s, v) => s + (v.views || v.viewCount || 0), 0) / videos.length;
  const avgEngagement = videos.reduce((s, v) => s + (v.likes || v.likeCount || 0) + (v.comments || v.commentCount || 0), 0) / videos.length;
  const viewRatio = Math.min(avgViews / Math.max(subscriberCount, 1), 1) * 40;
  const engagementScore = Math.min((avgEngagement / Math.max(avgViews, 1)) * 100, 1) * 30;
  const consistencyScore = Math.min(videos.length / 6, 1) * 30;
  return Math.round(viewRatio + engagementScore + consistencyScore);
}

export function isChannelConnected(): boolean {
  return localStorage.getItem("channel_connected") === "true";
}

export function clearChannelData(): void {
  localStorage.removeItem("yt_channel_data");
  localStorage.removeItem("channel_connected");
  localStorage.removeItem("channel_id");
}

export async function searchChannel(query: string): Promise<string | null> {
  const clean = query.trim()
    .replace(/https?:\/\//g, "")
    .replace(/www\.youtube\.com\//g, "")
    .replace(/youtube\.com\//g, "")
    .replace(/^@/, "")
    .split("/")[0].split("?")[0].trim();

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${clean}&key=${YT_API_KEY}`);
    const text = await r.text();
    if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
    let d: any;
    try { d = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
    if (d.items?.[0]?.id) return d.items[0].id;
  } catch {}

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${clean}&key=${YT_API_KEY}`);
    const text = await r.text();
    if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
    let d: any;
    try { d = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
    if (d.items?.[0]?.id) return d.items[0].id;
  } catch {}

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(clean)}&maxResults=1&key=${YT_API_KEY}`);
    const text = await r.text();
    if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
    let d: any;
    try { d = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
    if (d.items?.[0]?.snippet?.channelId) return d.items[0].snippet.channelId;
    if (d.items?.[0]?.id?.channelId) return d.items[0].id.channelId;
  } catch {}

  return null;
}

export async function getChannelById(channelId: string): Promise<ChannelData | null> {
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${YT_API_KEY}`);
    const text = await r.text();
    if (!text || text.trim() === "") throw new Error("Empty response from YouTube API");
    let d: any;
    try { d = JSON.parse(text); } catch { throw new Error("Invalid response from YouTube API"); }
    const ch = d.items?.[0];
    if (!ch) return null;
    const subs = parseInt(ch.statistics?.subscriberCount || "0");
    const views = parseInt(ch.statistics?.viewCount || "0");
    return {
      id: ch.id,
      name: ch.snippet.title,
      title: ch.snippet.title,
      handle: ch.snippet.customUrl || "",
      description: ch.snippet.description || "",
      avatar: ch.snippet.thumbnails?.high?.url || ch.snippet.thumbnails?.default?.url || "",
      banner: ch.brandingSettings?.image?.bannerExternalUrl || null,
      subscribers: subs,
      subscriberCount: subs,
      totalViews: views,
      viewCount: views,
      videoCount: parseInt(ch.statistics?.videoCount || "0"),
      createdAt: ch.snippet.publishedAt || "",
      country: ch.snippet.country || "",
      avgViews: 0, avgLikes: 0, avgComments: 0,
      bestDay: "", avgDaysBetweenUploads: 0, uploadFrequency: "",
      videos: [], comments: {},
      fetchedAt: new Date().toISOString(),
      isPublicData: true,
    };
  } catch { return null; }
}

export async function getChannelVideos(channelId: string, maxResults = 10): Promise<VideoData[]> {
  try {
    const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`);
    const chText = await chRes.text();
    if (!chText || chText.trim() === "") throw new Error("Empty response from YouTube API");
    let chData: any;
    try { chData = JSON.parse(chText); } catch { throw new Error("Invalid response from YouTube API"); }
    const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return [];

    const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&key=${YT_API_KEY}`);
    const plText = await plRes.text();
    if (!plText || plText.trim() === "") throw new Error("Empty response from YouTube API");
    let plData: any;
    try { plData = JSON.parse(plText); } catch { throw new Error("Invalid response from YouTube API"); }
    const ids = plData.items?.map((i: any) => i.contentDetails.videoId).join(",");
    if (!ids) return [];

    const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${YT_API_KEY}`);
    const vText = await vRes.text();
    if (!vText || vText.trim() === "") throw new Error("Empty response from YouTube API");
    let vData: any;
    try { vData = JSON.parse(vText); } catch { throw new Error("Invalid response from YouTube API"); }

    return (vData.items || []).map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      description: v.snippet.description || "",
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url || "",
      publishedAt: v.snippet.publishedAt,
      duration: v.contentDetails?.duration || "",
      views: parseInt(v.statistics?.viewCount || "0"),
      viewCount: parseInt(v.statistics?.viewCount || "0"),
      likes: parseInt(v.statistics?.likeCount || "0"),
      likeCount: parseInt(v.statistics?.likeCount || "0"),
      comments: parseInt(v.statistics?.commentCount || "0"),
      commentCount: parseInt(v.statistics?.commentCount || "0"),
      tags: v.snippet.tags || [],
      categoryId: v.snippet.categoryId || "",
      isShort: false,
    }));
  } catch { return []; }
}
