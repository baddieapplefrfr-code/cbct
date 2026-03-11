import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, formatCount, type VideoData, type ChannelData } from "@/lib/youtube-api";
import { callGroq } from "@/lib/groq-api";

export default function WarRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [latestVideo, setLatestVideo] = useState<VideoData | null>(null);
  const [avgViews, setAvgViews] = useState(0);
  const [avgLikes, setAvgLikes] = useState(0);
  const [avgComments, setAvgComments] = useState(0);
  const [aiAdvice, setAiAdvice] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
    intervalRef.current = setInterval(loadData, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function loadData() {
    try {
      const ch = await getMyChannel();
      setChannel(ch);
      const vids = await getRecentVideos(ch.id, 10);
      if (vids.length === 0) return;

      setLatestVideo(vids[0]);
      const avg = vids.slice(1);
      setAvgViews(avg.length > 0 ? Math.round(avg.reduce((s, v) => s + v.viewCount, 0) / avg.length) : 0);
      setAvgLikes(avg.length > 0 ? Math.round(avg.reduce((s, v) => s + v.likeCount, 0) / avg.length) : 0);
      setAvgComments(avg.length > 0 ? Math.round(avg.reduce((s, v) => s + v.commentCount, 0) / avg.length) : 0);

      const hoursLive = Math.round((Date.now() - new Date(vids[0].publishedAt).getTime()) / 3600000);

      const result = await callGroq(
        "This video has been live for a certain number of hours. Given the performance data compared to channel averages, is it on track to succeed or fail? What is the single most important thing the creator should do in the next 30 minutes? Be specific and actionable in 2-3 sentences.",
        `Video: "${vids[0].title}" live for ${hoursLive} hours\nViews: ${vids[0].viewCount} (avg: ${avgViews})\nLikes: ${vids[0].likeCount} (avg: ${avgLikes})\nComments: ${vids[0].commentCount} (avg: ${avgComments})`
      );
      setAiAdvice(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getStatus = (current: number, average: number) => {
    const ratio = average > 0 ? current / average : 0;
    if (ratio >= 0.7) return { color: "text-success", bg: "bg-success", label: "ON TRACK" };
    if (ratio >= 0.4) return { color: "text-warning", bg: "bg-warning", label: "WARNING" };
    return { color: "text-destructive", bg: "bg-destructive", label: "CRITICAL" };
  };

  if (loading) {
    return (
      <FeaturePage emoji="🚨" title="Launch Control" description="Real-time performance monitoring for your latest upload">
        <LoadingSteps steps={["Fetching latest video...", "Comparing to averages...", "Generating tactical advice..."]} currentStep={0} />
      </FeaturePage>
    );
  }

  if (!latestVideo) {
    return (
      <FeaturePage emoji="🚨" title="Launch Control" description="Real-time performance monitoring for your latest upload">
        <p className="text-center text-muted-foreground py-16">No videos found. Upload your first video to use Launch Control.</p>
      </FeaturePage>
    );
  }

  const hoursLive = Math.round((Date.now() - new Date(latestVideo.publishedAt).getTime()) / 3600000);
  const metrics = [
    { label: "Views", value: latestVideo.viewCount, avg: avgViews },
    { label: "Likes", value: latestVideo.likeCount, avg: avgLikes },
    { label: "Comments", value: latestVideo.commentCount, avg: avgComments },
  ];

  return (
    <FeaturePage emoji="🚨" title="Launch Control" description="Real-time performance monitoring for your latest upload">
      {/* Latest video header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-6 mb-6 flex gap-4 items-center">
        <img src={latestVideo.thumbnail} alt={latestVideo.title} className="h-20 w-36 rounded-lg object-cover" />
        <div className="flex-1">
          <p className="font-semibold text-lg">{latestVideo.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Live for {hoursLive} hours</span>
            <span className="text-xs text-muted-foreground">Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Traffic light metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {metrics.map((m, i) => {
          const status = getStatus(m.value, m.avg);
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-5 text-center"
            >
              <div className={`inline-flex h-3 w-3 rounded-full ${status.bg} mb-3 animate-pulse`} />
              <p className="text-2xl font-black">{formatCount(m.value)}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={`text-xs font-bold mt-1 ${status.color}`}>{status.label}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg: {formatCount(m.avg)}</p>
            </motion.div>
          );
        })}
      </div>

      {/* AI Advice */}
      {aiAdvice && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-xs font-semibold uppercase text-primary mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" /> AI Tactical Advice
          </p>
          <p className="text-sm leading-relaxed">{aiAdvice}</p>
        </motion.div>
      )}
    </FeaturePage>
  );
}
