import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Wrench, ChevronDown, Skull, Zap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected, formatCount, type VideoData, type ChannelData } from "@/lib/youtube-api";
import { callAI, parseJsonSafely } from "@/lib/ai-service";
import { getSelectedVideo, clearSelectedVideo } from "@/lib/video-context";

interface Diagnosis {
  reason: string;
  evidence: string;
  emotional_context: string;
  fix: string;
  priority: string;
}

export default function VideoDeath() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis[]>([]);
  const [killer, setKiller] = useState("");
  const [failureType, setFailureType] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadVideos();
  }, [navigate]);

  useEffect(() => {
    if (selectedVideoId && !loading && diagnosis.length === 0) {
      runDiagnosis();
    }
  }, [selectedVideoId]);

  async function loadVideos() {
    try {
      const stored = localStorage.getItem('yt_channel_data');
      if (!stored) { navigate('/'); return; }
      const ch: ChannelData = JSON.parse(stored);
      setChannel(ch);
      const vids = ch.videos || [];
      setVideos(vids);

      const preSelected = getSelectedVideo();
      if (preSelected) {
        clearSelectedVideo();
        const match = vids.find(v => v.id === preSelected.id);
        if (match) { setSelectedVideoId(match.id); return; }
      }
      // Auto-select worst recent video so analysis runs immediately
      const recent = vids.slice(0, 10) || [];
      if (recent.length > 0) {
        const avg = recent.reduce((s, v) => s + Number(v.views), 0) / recent.length;
        const worst = recent.reduce((prev, curr) =>
          (Number(curr.views) / avg) < (Number(prev.views) / avg) ? curr : prev
        );
        setSelectedVideoId(worst.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVideos(false);
    }
  }

  async function runDiagnosis() {
    if (!selectedVideoId || !channel) return;
    const video = videos.find(v => v.id === selectedVideoId);
    if (!video) return;

    setLoading(true);
    setDiagnosis([]);
    setKiller("");
    setFailureType("");
    setLoadStep(0);

    const avgViews = Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length);
    const avgLikes = Math.round(videos.reduce((s, v) => s + v.likes, 0) / videos.length);
    const avgComments = Math.round(videos.reduce((s, v) => s + v.comments, 0) / videos.length);
    const publishDay = new Date(video.publishedAt).toLocaleDateString("en-US", { weekday: "long" });

    setTimeout(() => setLoadStep(1), 1500);
    setTimeout(() => setLoadStep(2), 3000);

    try {
      const result = await callAI(
        `You are a brutal YouTube algorithm expert. Given this video's performance data compared to channel averages, identify exactly 3 reasons it underperformed. 
Return JSON with this exact structure:
{"failure_type":"PACKAGING|CONTENT|TIMING|ALGORITHM","killer_reason":"Single most important reason this video failed","bottom_line":"One sentence summary","diagnosis":[{"reason":"specific reason","evidence":"data evidence","emotional_context":"impact on creator","fix":"actionable fix","priority":"high|medium|low"},{"reason":"...","evidence":"...","emotional_context":"...","fix":"...","priority":"..."},{"reason":"...","evidence":"...","emotional_context":"...","fix":"...","priority":"..."}]}
Be specific, be brutal, be helpful.`,
        `Channel: ${channel.name} (${formatCount(channel.subscribers)} subs)
Channel averages: ${formatCount(avgViews)} views, ${avgLikes} likes, ${avgComments} comments per video
THIS VIDEO:
Title: "${video.title}"
Views: ${formatCount(video.views)} (${video.views < avgViews ? "BELOW" : "ABOVE"} average by ${Math.abs(Math.round((video.views / avgViews - 1) * 100))}%)
Likes: ${video.likes}
Comments: ${video.comments}
Published: ${video.publishedAt} (${publishDay})
Why did this video underperform?`
      );

      const parsed = parseJsonSafely(result);
      if (parsed) {
        setFailureType(parsed.failure_type || "PACKAGING");
        setKiller(parsed.killer_reason || parsed.bottom_line || "Check the diagnosis above");
        if (Array.isArray(parsed.diagnosis)) {
          setDiagnosis(parsed.diagnosis);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const priorityColor = (p: string) => {
    if (p === "high") return "hsl(var(--destructive))";
    if (p === "medium") return "hsl(var(--warning))";
    return "hsl(var(--muted-foreground))";
  };

  const avgViews = videos.length > 0 ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0;

  return (
    <FeaturePage emoji="💀" title="Autopsy Room" description="Select any video and get a brutally honest diagnosis with actionable fixes">
      <div className="mb-6">
        {loadingVideos ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="w-40 shrink-0 aspect-video rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {videos.map(v => {
              const isBelow = v.views < avgViews * 0.6;
              const isAbove = v.views > avgViews * 1.2;
              const isSelected = selectedVideoId === v.id;
              return (
                <motion.div key={v.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedVideoId(v.id)} className={`w-40 shrink-0 cursor-pointer rounded-xl overflow-hidden transition-all ${isSelected ? 'ring-2 ring-destructive shadow-[0_0_20px_rgba(248,113,113,0.3)]' : 'hover:ring-1 hover:ring-border'}`} style={{ background: "hsl(var(--background-card))", border: "1px solid hsl(var(--border))" }}>
                  <div className="relative">
                    <img src={v.thumbnail} alt={v.title} className="w-full aspect-video object-cover" loading="lazy" />
                    <div className="absolute top-2 right-2">
                      {isBelow ? <Skull className="h-5 w-5 text-destructive drop-shadow-lg" /> : isAbove ? <Flame className="h-5 w-5 text-success drop-shadow-lg" /> : null}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2 mb-1">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{formatCount(v.views)} views</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedVideoId && !loading && diagnosis.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Button variant="destructive" size="lg" className="w-full h-14 rounded-xl text-lg font-bold mb-8 animate-pulse" onClick={runDiagnosis}>
              <Skull className="mr-2 h-5 w-5" /> Run Autopsy
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <LoadingSteps steps={["Fetching video data...", "Analysing performance patterns...", "Generating brutal diagnosis..."]} currentStep={loadStep} />
      )}

      <AnimatePresence>
        {killer && failureType && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="cb-card mb-6" style={{ boxShadow: "0 0 20px rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.15)" }}>
            <div className="text-center">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-4" style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
                {failureType}
              </span>
              <p className="text-2xl font-bold font-display mb-2">{killer}</p>
              <p className="text-sm text-primary">Fix this first.</p>
            </div>
          </motion.div>
        )}

        {diagnosis.length > 0 && (
          <div className="space-y-4 mb-8">
            {diagnosis.slice(0, showFullAnalysis ? diagnosis.length : 3).map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="cb-card relative">
                <div className="absolute top-4 right-4 h-3 w-3 rounded-full" style={{ background: priorityColor(d.priority) }} />
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold mb-1">{d.reason}</p>
                    <p className="text-sm" style={{ color: "hsl(var(--primary))" }}>{d.evidence}</p>
                    {d.emotional_context && <p className="text-xs text-muted-foreground mt-1 italic">{d.emotional_context}</p>}
                  </div>
                  <CopyButton text={`${d.reason}\n${d.evidence}\n${d.fix}`} />
                </div>
                <div className="ml-11 mt-3 p-3 rounded-lg" style={{ background: "hsl(var(--success) / 0.06)", border: "1px solid hsl(var(--success) / 0.15)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-semibold uppercase text-success">Fix</span>
                  </div>
                  <p className="text-sm">{d.fix}</p>
                </div>
              </motion.div>
            ))}
            {diagnosis.length > 3 && !showFullAnalysis && (
              <Button variant="ghost" className="w-full" onClick={() => setShowFullAnalysis(true)}>
                See Complete Breakdown <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </AnimatePresence>
    </FeaturePage>
  );
}
