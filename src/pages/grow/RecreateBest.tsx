import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingUp, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount, type VideoData, type ChannelData } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

export default function RecreateBest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [outliers, setOutliers] = useState<VideoData[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      setLoadStep(1);
      const vids = await getRecentVideos(ch.id, 20);
      const avgViews = vids.reduce((s, v) => s + v.viewCount, 0) / vids.length;
      const topVids = vids.filter(v => v.viewCount >= avgViews * 2).slice(0, 3);
      if (topVids.length === 0) {
        // Use top 3 by views
        topVids.push(...[...vids].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3));
      }
      setOutliers(topVids);
      setLoadStep(2);

      const context = getChannelContext(ch, vids);
      const topSummary = topVids.map(v => `"${v.title}" - ${v.viewCount} views, ${v.likeCount} likes`).join("\n");

      const result = await callGroq(
        "Analyse these top performing videos and extract the exact winning formula. What title pattern, topic angle, hook style, and thumbnail emotion made them work? Give a replication blueprint with 3 new video ideas using the exact same formula. Return JSON with fields: formula (object with title_pattern, topic_angle, hook_style, thumbnail_emotion), new_ideas (array of 3 objects with title, why_it_works, hook).",
        `${context}\n\nTOP PERFORMING VIDEOS (2x+ above average):\n${topSummary}`
      );

      setAnalysis(parseJsonFromResponse(result));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <FeaturePage emoji="⚡" title="Lightning in a Bottle" description="Find your outlier formula and replicate it">
        <LoadingSteps steps={["Fetching your videos...", "Finding your outliers...", "Extracting the winning formula..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="⚡" title="Lightning in a Bottle" description="Find your outlier formula and replicate it">
      {/* Top performers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Your Outlier Videos
        </h2>
        <div className="grid gap-3">
          {outliers.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="rounded-xl border border-primary/20 bg-card p-4 flex gap-4 items-center"
            >
              <img src={v.thumbnail} alt={v.title} className="h-16 w-28 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{v.title}</p>
                <p className="text-sm text-primary">{formatCount(v.viewCount)} views · {formatCount(v.likeCount)} likes</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {analysis && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Formula */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> What Made It Work
            </h3>
            {analysis.formula && Object.entries(analysis.formula).map(([key, val]) => (
              <div key={key} className="mb-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{key.replace(/_/g, " ")}</p>
                <p className="text-sm mt-1">{String(val)}</p>
              </div>
            ))}
          </motion.div>

          {/* Replicate */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" /> Replicate It
            </h3>
            {analysis.new_ideas?.map((idea: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 card-glow">
                <p className="font-semibold mb-1">{idea.title}</p>
                <p className="text-sm text-muted-foreground mb-3">{idea.why_it_works}</p>
                <p className="text-xs text-primary italic mb-3">Hook: {idea.hook}</p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(idea.title)}`)}
                >
                  Build This Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
