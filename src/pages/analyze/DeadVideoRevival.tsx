import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ghost, RefreshCw, ArrowRight } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount, type VideoData } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface RevivalCandidate {
  video_title: string;
  new_title: string;
  thumbnail_concept: string;
  pinned_comment: string;
  best_time: string;
  revival_score: number;
}

export default function DeadVideoRevival() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [candidates, setCandidates] = useState<RevivalCandidate[]>([]);
  const [underperformers, setUnderperformers] = useState<VideoData[]>([]);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 20);
      setLoadStep(1);

      const avgViews = vids.reduce((s, v) => s + v.viewCount, 0) / vids.length;
      const under = vids.filter(v => v.viewCount < avgViews * 0.5).slice(0, 5);
      setUnderperformers(under);

      if (under.length === 0) {
        setLoading(false);
        return;
      }
      setLoadStep(2);

      const context = getChannelContext(ch, vids);
      const underSummary = under.map(v => `"${v.title}" - ${v.viewCount} views (avg: ${Math.round(avgViews)})`).join("\n");

      const result = await callGroq(
        "These old videos are underperforming. For each one, suggest: new title, new thumbnail concept, pinned comment to re-engage algorithm, best time to re-promote, and revival probability score 1-100. Return JSON array with fields: video_title, new_title, thumbnail_concept, pinned_comment, best_time, revival_score.",
        `${context}\n\nUNDERPERFORMING VIDEOS:\n${underSummary}\n\nGenerate revival strategies for each.`
      );

      const parsed = parseJsonFromResponse(result);
      if (Array.isArray(parsed)) {
        setCandidates(parsed.sort((a: any, b: any) => (b.revival_score || 0) - (a.revival_score || 0)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <FeaturePage emoji="👻" title="Dead Video Revival" description="Revive underperforming videos with current trend potential">
        <LoadingSteps steps={["Finding underperformers...", "Analysing revival potential...", "Generating revival strategies..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="👻" title="Dead Video Revival" description="Revive underperforming videos with current trend potential">
      {candidates.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No significant underperformers found — your content is performing well!</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {candidates.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className="rounded-xl border border-border bg-card p-5 card-glow"
            >
              {/* Revival score */}
              <div className="flex items-center justify-between mb-3">
                <Ghost className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Revival Score</span>
                  <div className="h-2 w-16 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.revival_score}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-sm font-bold text-primary">{c.revival_score}%</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-through mb-1">{c.video_title}</p>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-3 w-3 text-success" />
                <p className="font-semibold text-success">{c.new_title}</p>
                <CopyButton text={c.new_title} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="p-2 rounded-lg bg-secondary">
                  <p className="text-xs font-semibold text-muted-foreground">Thumbnail</p>
                  <p className="text-xs">{c.thumbnail_concept}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary">
                  <p className="text-xs font-semibold text-muted-foreground">Pinned Comment</p>
                  <p className="text-xs">{c.pinned_comment}</p>
                </div>
                <p className="text-xs text-muted-foreground">📅 Best time: {c.best_time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </FeaturePage>
  );
}
