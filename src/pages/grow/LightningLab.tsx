import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import ShareInsight from "@/components/ShareInsight";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";
import { formatCount } from "@/lib/youtube-api";
import type { VideoData } from "@/lib/youtube-api";
import VideoModal from "@/components/VideoModal";

export default function LightningLab() {
  const { channel, videos, loading: dataLoading, avgViews, channelContext } = useChannelData();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [outliers, setOutliers] = useState<VideoData[]>([]);
  const [formula, setFormula] = useState<any>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);

  useEffect(() => { if (channel && videos.length > 0 && outliers.length === 0) analyse(); }, [channel, videos]);

  async function analyse() {
    setLoading(true);
    setStep(0);
    const outs = videos.filter(v => v.viewCount > avgViews * 2);
    setOutliers(outs.length > 0 ? outs : videos.slice(0, 3));
    setStep(1);

    try {
      const res = await callAI(
        "You are a YouTube content strategist. Analyse these outlier videos and extract a replicable winning formula. Return JSON: { title_formula: string, hook_style: string, thumbnail_approach: string, timing_pattern: string, topic_angle: string, replication_ideas: [{title: string, explanation: string, hook: string}] }",
        `${channelContext}\n\nOutlier videos (2x+ above average):\n${(outs.length > 0 ? outs : videos.slice(0, 3)).map(v => `"${v.title}" - ${v.viewCount} views`).join("\n")}`
      );
      setStep(2);
      setFormula(parseJsonFromAI(res));
    } catch {}
    setLoading(false);
  }

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="💡" title="Lightning Lab" description="Find your outliers. Replicate the formula.">
        <LoadingSteps steps={["Finding outlier videos...", "Extracting winning formula...", "Building ideas..."]} currentStep={step} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="💡" title="Lightning Lab" description="Find your outliers. Replicate the formula.">
      {/* Outlier Videos */}
      <div className="space-y-4 mb-10">
        <h3 className="t-label text-muted-foreground">Your Lightning Videos</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {outliers.slice(0, 6).map((v, i) => {
            const overperf = avgViews > 0 ? Math.round(((v.viewCount - avgViews) / avgViews) * 100) : 0;
            return (
              <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} onClick={() => setSelectedVideo(v)} className="cb-card cursor-pointer p-0 overflow-hidden">
                <img src={v.thumbnail} alt={v.title} className="w-full h-28 object-cover" />
                <div className="p-3">
                  <p className="text-xs font-medium truncate mb-1">{v.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatCount(v.viewCount)} views</span>
                    <span className="text-xs font-bold text-success">+{overperf}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Formula */}
      {formula && (
        <div className="space-y-6">
          <h3 className="t-label text-muted-foreground">The Formula</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Title Formula", value: formula.title_formula },
              { label: "Hook Style", value: formula.hook_style },
              { label: "Thumbnail", value: formula.thumbnail_approach },
              { label: "Topic Angle", value: formula.topic_angle },
            ].map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="cb-card">
                <p className="t-label text-primary mb-1">{f.label}</p>
                <p className="text-sm">{f.value}</p>
              </motion.div>
            ))}
          </div>

          {formula.replication_ideas && (
            <div className="space-y-3">
              <h3 className="t-label text-muted-foreground">Replicate It</h3>
              {formula.replication_ideas.map((idea: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="cb-card" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
                  <p className="font-semibold text-sm mb-1">{idea.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{idea.explanation}</p>
                  <p className="text-xs italic text-muted-foreground">Hook: "{idea.hook}"</p>
                </motion.div>
              ))}
            </div>
          )}

          <ShareInsight title="Lightning Lab" value={formula.title_formula} subtitle={`Hook: ${formula.hook_style}`} />
        </div>
      )}

      <VideoModal video={selectedVideo} avgViews={avgViews} onClose={() => setSelectedVideo(null)} />
    </FeaturePage>
  );
}
