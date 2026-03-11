import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ChannelData, VideoData } from "@/lib/youtube-api";
import { formatCount } from "@/lib/youtube-api";

function detectNiche(videos: VideoData[]): string {
  const titles = videos.map((v) => v.title).join(" ").toLowerCase();
  if (titles.includes("code") || titles.includes("program") || titles.includes("dev"))
    return "Tech & Programming";
  if (titles.includes("game") || titles.includes("gaming") || titles.includes("play"))
    return "Gaming";
  if (titles.includes("cook") || titles.includes("recipe") || titles.includes("food"))
    return "Food & Cooking";
  if (titles.includes("fitness") || titles.includes("workout") || titles.includes("gym"))
    return "Fitness";
  if (titles.includes("finance") || titles.includes("money") || titles.includes("invest"))
    return "Finance";
  if (titles.includes("vlog") || titles.includes("day in") || titles.includes("life"))
    return "Vlogging";
  if (titles.includes("music") || titles.includes("song") || titles.includes("beat"))
    return "Music";
  if (titles.includes("beauty") || titles.includes("makeup") || titles.includes("skincare"))
    return "Beauty";
  if (titles.includes("travel") || titles.includes("trip") || titles.includes("explore"))
    return "Travel";
  if (titles.includes("business") || titles.includes("entrepreneur") || titles.includes("startup"))
    return "Business";
  if (titles.includes("review") || titles.includes("unbox"))
    return "Reviews";
  if (titles.includes("tutorial") || titles.includes("how to") || titles.includes("learn"))
    return "Education";
  return "General";
}

export interface UseChannelDataResult {
  channel: ChannelData | null;
  videos: VideoData[];
  comments: Record<string, any[]>;
  subscribers: number;
  avgViews: number;
  avgLikes: number;
  totalViews: number;
  videoCount: number;
  bestDay: string;
  uploadFrequency: string;
  isPublicData: boolean;
  channelName: string;
  channelAvatar: string;
  niche: string;
  channelContext: string;
  isConnected: boolean;
  loading: boolean;
  error: string;
  reload: () => void;
}

export function useChannelData(videoCount?: number): UseChannelDataResult {
  const navigate = useNavigate();
  const stored = localStorage.getItem("yt_channel_data");

  useEffect(() => {
    if (!stored) {
      navigate("/", { replace: true });
    }
  }, [stored, navigate]);

  if (!stored) {
    return {
      channel: null,
      videos: [],
      comments: {},
      subscribers: 0,
      avgViews: 0,
      avgLikes: 0,
      totalViews: 0,
      videoCount: 0,
      bestDay: "Wednesday",
      uploadFrequency: "Weekly",
      isPublicData: true,
      channelName: "",
      channelAvatar: "",
      niche: "General",
      channelContext: "",
      isConnected: false,
      loading: false,
      error: "",
      reload: () => {},
    };
  }

  const data: ChannelData = JSON.parse(stored);
  const videos = videoCount ? data.videos.slice(0, videoCount) : data.videos;

  const channelContext = `Channel: ${data.name}
Subscribers: ${formatCount(data.subscribers)}
Avg Views: ${formatCount(data.avgViews)}
Upload Frequency: ${data.uploadFrequency}
Best Day: ${data.bestDay}

Recent Videos:
${videos
  .slice(0, 10)
  .map(
    (v) =>
      `"${v.title}" - ${v.views || v.viewCount} views, ${v.likes || v.likeCount} likes, ${v.comments || v.commentCount} comments, published ${v.publishedAt}`
  )
  .join("\n")}`;

  return {
    channel: data,
    videos,
    comments: data.comments || {},
    subscribers: data.subscribers || 0,
    avgViews: data.avgViews || 0,
    avgLikes: data.avgLikes || 0,
    totalViews: data.totalViews || 0,
    videoCount: data.videoCount || 0,
    bestDay: data.bestDay || "Wednesday",
    uploadFrequency: data.uploadFrequency || "Weekly",
    isPublicData: data.isPublicData ?? true,
    channelName: data.name || "",
    channelAvatar: data.avatar || "",
    niche: detectNiche(videos),
    channelContext,
    isConnected: true,
    loading: false,
    error: "",
    reload: () => window.location.reload(),
  };
}
