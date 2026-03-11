import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Eye, Clock, Flame, Zap, ArrowRight, AlertTriangle, BarChart2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useChannelData } from "@/hooks/useChannelData";
import { formatCount, calcChannelScore, timeAgo, clearChannelData, type VideoData } from "@/lib/youtube-api";
import { callAI } from "@/lib/ai-service";
import VideoModal from "@/components/VideoModal";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type TimeRange = "7d" | "30d" | "all";
type SortMode = "recent" | "views" | "worst";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--border))" }}>
      <p className="text-sm font-semibold">{formatCount(payload[0]?.value)} views</p>
      <p className="text-xs text-muted-foreground">{payload[0]?.payload?.label}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { channel, videos, avgViews, subscribers, isConnected } = useChannelData();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [brief, setBrief] = useState("");
  const [briefLoading, setBriefLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    if (!channel || videos.length === 0) return;
    setBriefLoading(true);
    callAI(
      "You are a YouTube growth coach. Respond with EXACTLY 3 bullet points. Each bullet must contain a specific number or day. Start each with •. No preamble. No intro sentence. Just the 3 bullets. Never be vague.",
      `Channel: ${channel.name}. ${subscribers} subs. Avg views: ${avgViews}. Best day: ${channel.bestDay}. Upload frequency: ${channel.uploadFrequency}. Last 5 videos: ${videos.slice(0,5).map(v=>`"${v.title}" got ${v.views} views`).join(", ")}.`
    ).then(r => setBrief(r)).catch(() => setBrief("")).finally(() => setBriefLoading(false));
  }, [channel?.name]);

  const graphData = useMemo(() => {
    if (!videos.length) return [];
    const now = Date.now();
    const cutoff = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 3650;
    return videos
      .filter(v => (now - new Date(v.publishedAt).getTime()) / 86400000 <= cutoff)
      .slice(0, timeRange === "all" ? 200 : 50)
      .reverse()
      .map(v => ({
        views: Number(v.views) || 0,
        label: v.title.slice(0, 40) + (v.title.length > 40 ? "…" : ""),
        date: new Date(v.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [videos, timeRange]);

  const sortedVideos = useMemo(() => {
    const v = [...videos];
    if (sortMode === "views") return v.sort((a, b) => Number(b.views) - Number(a.views));
    if (sortMode === "worst") return v.sort((a, b) => (Number(a.views) / Math.max(avgViews, 1)) - (Number(b.views) / Math.max(avgViews, 1)));
    return v;
  }, [videos, sortMode, avgViews]);

  if (!isConnected) return null;

  const channelScore = channel ? calcChannelScore(videos, channel.subscribers) : 0;
  const latestVideo = videos[0];
  const isUnderperforming = latestVideo && avgViews > 0 && latestVideo.views < avgViews * 0.6;
  const briefLines = brief.split("\n").filter(l => l.trim().startsWith("•") || l.trim().startsWith("-")).slice(0, 3);

  const metrics = [
    { label: "Avg Views", value: formatCount(avgViews), icon: Eye, color: "hsl(var(--cat-analyze))" },
    { label: "Channel Score", value: `${channelScore}/100`, icon: TrendingUp, color: "hsl(var(--primary))" },
    { label: "Best Day", value: channel?.bestDay?.slice(0, 3) || "—", icon: Clock, color: "hsl(var(--cat-create))" },
    { label: "Frequency", value: channel?.uploadFrequency || "—", icon: Flame, color: "hsl(var(--cat-grow))" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[920px] mx-auto space-y-6">

      {/* ── Header ─────────────────────────── */}
      {!channel ? (
        <div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-6 w-48" /></div>
      ) : (
        <div className="flex items-center gap-4">
          <img src={channel.avatar} alt="" className="h-12 w-12 rounded-full ring-2 ring-primary/20 object-cover" />
          <div>
            <h1 className="text-xl font-bold font-display">{channel.name}</h1>
            <p className="text-sm text-muted-foreground">{formatCount(subscribers)} subscribers</p>
          </div>
        </div>
      )}

      {/* ── Underperforming alert ───────────── */}
      <AnimatePresence>
        {isUnderperforming && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl p-4 flex items-start gap-3" style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
            <div className="flex-1">
              <AlertTriangle className="h-4 w-4 text-destructive inline mr-2" />
              <span className="text-sm font-semibold">Latest video is underperforming</span>
              <p className="text-xs text-muted-foreground mt-1">
                "{latestVideo.title.slice(0, 50)}…" got {formatCount(latestVideo.views)} views — {Math.round((1 - latestVideo.views / avgViews) * 100)}% below your average
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs rounded-lg" onClick={() => navigate("/diagnose/video-death")}>
              Run Autopsy <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OAuth Private Analytics Banner ── */}
      {!localStorage.getItem("yt_full_connect") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.18)" }}>
          <div>
            <p className="text-sm font-semibold">🔒 Unlock Private Analytics</p>
            <p className="text-xs text-muted-foreground mt-0.5">Connect Google to see real CTR, retention %, impressions and revenue estimates</p>
          </div>
          <Button size="sm" className="shrink-0 text-xs h-8 gap-1.5"
            style={{ background: "#facc15", color: "#000" }}
            onClick={async () => { const { signInWithGoogle } = await import("@/lib/youtube-auth"); signInWithGoogle(); }}>
            Connect Google
          </Button>
        </motion.div>
      )}

      {/* ── Metrics row ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="cb-card text-center py-4">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-xl font-bold font-display">{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Views Graph ─────────────────────── */}
      <div className="cb-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Views Per Upload</span>
          </div>
          <div className="flex gap-1">
            {(["7d", "30d", "all"] as TimeRange[]).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" style={timeRange === r ? { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" } : { color: "hsl(var(--muted-foreground))" }}>
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {graphData.length <= 1 ? (
          <div className="h-36 flex items-center justify-center text-xs text-muted-foreground">
            {graphData.length === 0 ? "No uploads in this period" : "Not enough upload data for this period"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={graphData}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(48, 96%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240, 5%, 65%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 65%)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCount(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="views" stroke="hsl(48, 96%, 53%)" strokeWidth={2} fill="url(#viewsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── AI Weekly Brief ──────────────────── */}
      <div className="cb-card" style={{ borderLeft: "3px solid hsl(var(--primary))" }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Weekly Brief</span>
        </div>
        {briefLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : briefLines.length > 0 ? (
          <div className="space-y-2">
            {briefLines.map((line, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5 font-bold">•</span>
                <span>{line.replace(/^[•\-]\s*/, "")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Post consistently and engage with every comment this week.</p>
        )}
      </div>

      {/* ── Video Grid ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold font-display">Your Videos</h2>
          <div className="flex gap-1">
            {([["recent","Recent"],["views","Most Views"],["worst","Underperforming"]] as [SortMode, string][]).map(([mode, label]) => (
              <button key={mode} onClick={() => setSortMode(mode)} className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" style={sortMode === mode ? { background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" } : { color: "hsl(var(--muted-foreground))" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {!channel ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedVideos.map((v, i) => {
              const perf = avgViews > 0 ? (v.views - avgViews) / avgViews : 0;
              const maxV = Math.max(...sortedVideos.map(x => x.views), 1);
              const isAbove = perf >= 0;
              return (
                <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setSelectedVideo(v)} className="cursor-pointer rounded-xl overflow-hidden cb-card p-0 group">
                  <div className="relative">
                    <img src={v.thumbnail} alt={v.title} className="w-full h-24 object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {Math.abs(perf) > 0.5 && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: isAbove ? "hsl(var(--success) / 0.9)" : "hsl(var(--destructive) / 0.9)", color: "#fff" }}>
                        {isAbove ? "+" : ""}{Math.round(perf * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate mb-1">{v.title}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCount(v.views)} · {timeAgo(v.publishedAt)}</p>
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((v.views / maxV) * 100, 100)}%`, background: isAbove ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ────────────────────── */}
      <div>
        <h2 className="text-base font-semibold font-display mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "Get Roasted 🔥", url: "/diagnose/roast", color: "hsl(var(--cat-diagnose))" },
            { label: "Video Autopsy 💀", url: "/diagnose/video-death", color: "hsl(var(--destructive))" },
            { label: "What To Make Next 💡", url: "/strategy/next-video", color: "hsl(var(--cat-strategy))" },
            { label: "Talk to Max 🤖", url: "/coach", color: "hsl(var(--cat-coach))" },
          ].map((a, i) => (
            <button key={a.label} onClick={() => navigate(a.url)} className="cb-card p-4 text-left group hover:scale-[1.02] transition-transform">
              <p className="text-sm font-semibold mb-1">{a.label}</p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      <VideoModal video={selectedVideo} avgViews={avgViews} onClose={() => setSelectedVideo(null)} />
    </div>
  );
}
