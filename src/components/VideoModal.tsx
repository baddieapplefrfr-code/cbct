import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, ThumbsUp, MessageSquare, Loader2, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCount, timeAgo, type VideoData } from "@/lib/youtube-api";
import { callAI, parseJsonSafely } from "@/lib/ai-service";
import { setSelectedVideo } from "@/lib/video-context";

interface VideoModalProps {
  video: VideoData | null;
  avgViews: number;
  onClose: () => void;
}

interface AutopsyResult {
  failure_type: string;
  killer_reason: string;
  bottom_line: string;
  diagnosis: { reason: string; evidence: string; fix: string; priority: string }[];
}

export default function VideoModal({ video, avgViews, onClose }: VideoModalProps) {
  const navigate = useNavigate();
  const [autopsy, setAutopsy] = useState<AutopsyResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-run the moment a video is selected
  useEffect(() => {
    if (!video) { setAutopsy(null); return; }
    runAutopsy(video);
  }, [video?.id]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  async function runAutopsy(v: VideoData) {
    setLoading(true);
    setAutopsy(null);
    try {
      const perf = avgViews > 0 ? Math.round(((v.views - avgViews) / avgViews) * 100) : 0;
      const result = await callAI(
        `YouTube algorithm expert. Diagnose this video performance vs channel average. Return ONLY valid JSON:
{
  "failure_type": "PACKAGING" | "CONTENT" | "TIMING" | "ALGORITHM" | "OUTPERFORMER",
  "killer_reason": "The single most important reason in one punchy sentence",
  "bottom_line": "One specific action to fix this right now",
  "diagnosis": [
    {"reason": "specific reason", "evidence": "data-backed evidence", "fix": "exact fix to implement today", "priority": "high|medium|low"},
    {"reason": "...", "evidence": "...", "fix": "...", "priority": "..."},
    {"reason": "...", "evidence": "...", "fix": "...", "priority": "..."}
  ]
}`,
        `Channel avg: ${Math.round(avgViews)} views/video.
Video: "${v.title}"
Performance: ${v.views} views (${perf > 0 ? "+" : ""}${perf}% vs average)
Likes: ${v.likes} | Comments: ${v.comments}
Published: ${new Date(v.publishedAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
Like rate: ${v.views > 0 ? ((v.likes / v.views) * 100).toFixed(2) : 0}%`
      );
      const parsed = parseJsonSafely(result);
      if (parsed) setAutopsy(parsed);
    } catch { /* silent */ }
    setLoading(false);
  }

  if (!video) return null;

  const perf = avgViews > 0 ? Math.round(((video.views - avgViews) / avgViews) * 100) : 0;
  const isAbove = perf >= 0;
  const pColor = (p: string) => p === "high" ? "#f87171" : p === "medium" ? "#facc15" : "#4ade80";

  function navTo(path: string) {
    setSelectedVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, views: video.views, likes: video.likes, comments: video.comments, publishDate: video.publishedAt });
    onClose();
    navigate(path);
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl scrollbar-thin"
          style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--border))" }}>

          {/* Header */}
          <div className="sticky top-0 z-10 p-4 pb-3 flex items-start gap-3"
            style={{ background: "hsl(var(--background-card))", borderBottom: "1px solid hsl(var(--border))" }}>
            <img src={video.thumbnail} alt="" className="h-14 w-24 rounded-lg object-cover shrink-0" />
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-semibold line-clamp-2 leading-snug">{video.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo(video.publishedAt)}</p>
            </div>
            <button onClick={onClose}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Eye, label: "Views", value: formatCount(video.views) },
                { icon: ThumbsUp, label: "Likes", value: formatCount(video.likes) },
                { icon: MessageSquare, label: "Comments", value: formatCount(video.comments) },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--secondary))" }}>
                  <p className="text-base font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* vs average badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: isAbove ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                  color: isAbove ? "#4ade80" : "#f87171",
                  border: `1px solid ${isAbove ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                }}>
                {isAbove ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {Math.abs(perf)}% {isAbove ? "above" : "below"} your average
              </span>
              {!loading && (
                <button onClick={() => runAutopsy(video)}
                  className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Autopsy — runs automatically */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
              <div className="px-4 py-3 flex items-center gap-2"
                style={{ background: "hsl(var(--secondary))", borderBottom: "1px solid hsl(var(--border))" }}>
                <span className="text-sm">💀</span>
                <span className="text-xs font-bold uppercase tracking-wider">Instant Autopsy</span>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
              </div>
              <div className="p-4">
                {loading && (
                  <div className="space-y-2 py-2">
                    {[90, 70, 80].map((w, i) => (
                      <div key={i} className="h-3 rounded-full animate-pulse"
                        style={{ width: `${w}%`, background: "hsl(var(--secondary))" }} />
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">Diagnosing...</p>
                  </div>
                )}
                {!loading && autopsy && (
                  <div className="space-y-3">
                    <div className="rounded-lg p-3" style={{ background: "rgba(248,113,113,0.07)", borderLeft: "3px solid #f87171" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#f87171" }}>
                        {autopsy.failure_type}
                      </p>
                      <p className="text-sm font-semibold">{autopsy.killer_reason}</p>
                    </div>
                    {autopsy.diagnosis?.slice(0, 3).map((d, i) => (
                      <div key={i} className="rounded-lg p-3 space-y-1.5" style={{ background: "hsl(var(--secondary))" }}>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: pColor(d.priority) }} />
                          <p className="text-xs font-semibold">{d.reason}</p>
                        </div>
                        <p className="text-xs text-muted-foreground pl-3.5">{d.evidence}</p>
                        <p className="text-xs font-medium pl-3.5" style={{ color: "#4ade80" }}>→ {d.fix}</p>
                      </div>
                    ))}
                    <div className="rounded-lg p-3 text-center" style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.18)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#facc15" }}>Your #1 Fix</p>
                      <p className="text-sm font-semibold">{autopsy.bottom_line}</p>
                    </div>
                  </div>
                )}
                {!loading && !autopsy && (
                  <div className="text-center py-3">
                    <p className="text-xs text-muted-foreground mb-2">Diagnosis unavailable</p>
                    <button onClick={() => runAutopsy(video)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "hsl(var(--secondary))", color: "hsl(var(--primary))" }}>
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick nav chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Deep Autopsy", path: "/diagnose/video-death" },
                { label: "Mine Comments", path: "/grow/comment-intelligence" },
                { label: "Make Part 2", path: "/create/video-machine" },
              ].map(a => (
                <button key={a.path} onClick={() => navTo(a.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                  style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
                  {a.label} <ArrowRight className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
