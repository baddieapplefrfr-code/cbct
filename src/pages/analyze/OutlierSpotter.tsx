import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount, type VideoData } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

export default function OutlierSpotter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [overperformers, setOverperformers] = useState<(VideoData & { pct: number })[]>([]);
  const [underperformers, setUnderperformers] = useState<(VideoData & { pct: number })[]>([]);
  const [winFormula, setWinFormula] = useState("");
  const [failPattern, setFailPattern] = useState("");
  const [replicationIdeas, setReplicationIdeas] = useState<string[]>([]);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 20);
      const avg = vids.reduce((s, v) => s + v.viewCount, 0) / vids.length;
      setLoadStep(1);

      const over = vids.filter(v => v.viewCount >= avg * 2).map(v => ({ ...v, pct: Math.round((v.viewCount / avg) * 100) })).sort((a, b) => b.pct - a.pct);
      const under = vids.filter(v => v.viewCount < avg * 0.5).map(v => ({ ...v, pct: Math.round((v.viewCount / avg) * 100) })).sort((a, b) => a.pct - b.pct);
      setOverperformers(over);
      setUnderperformers(under);
      setLoadStep(2);

      const context = getChannelContext(ch, vids);

      if (over.length > 0) {
        const res = await callGroq(
          "Analyse these overperforming YouTube videos. Identify the common winning pattern in title structure, topic, emotional trigger, timing. Extract the winning formula. Generate 3 new video ideas using this formula. Return JSON: {formula: string, ideas: [string, string, string]}",
          `${context}\n\nOverperformers (2x+ avg):\n${over.map(v => `"${v.title}" - ${v.viewCount} views (${v.pct}% of avg)`).join("\n")}`
        );
        const parsed = parseJsonFromResponse(res);
        if (parsed) {
          setWinFormula(parsed.formula || "");
          setReplicationIdeas(parsed.ideas || []);
        }
      }

      if (under.length > 0) {
        const res2 = await callGroq(
          "Analyse these underperforming YouTube videos. Identify the common failure pattern. What should this creator never do again? 2-3 sentences.",
          `${context}\n\nUnderperformers (<50% avg):\n${under.map(v => `"${v.title}" - ${v.viewCount} views (${v.pct}% of avg)`).join("\n")}`
        );
        setFailPattern(res2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <FeaturePage emoji="⚡" title="Lightning in a Bottle" description="Find what made your best videos different and how to replicate it.">
        <LoadingSteps steps={["Fetching all videos...", "Identifying outliers...", "Extracting winning formula..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="⚡" title="Lightning in a Bottle" description="Find what made your best videos different and how to replicate it.">
      <div className="space-y-8">
        {/* Overperformers */}
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Zap className="h-5 w-5 text-primary" /> Lightning Videos (2x+ Average)</h2>
          {overperformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No videos significantly outperformed your average yet. Keep creating!</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {overperformers.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-success/20 bg-card p-4 card-glow flex gap-3">
                  <img src={v.thumbnail} alt="" className="h-16 w-28 rounded-lg object-cover shrink-0" />
                  <div>
                    <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{formatCount(v.viewCount)} views</span>
                      <span className="text-xs font-bold text-success">▲ {v.pct}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Winning Formula */}
        {winFormula && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-xs font-semibold uppercase text-primary mb-2">🏆 Your Winning Formula</p>
            <p className="text-sm leading-relaxed">{winFormula}</p>
            <CopyButton text={winFormula} className="mt-2" />
          </motion.div>
        )}

        {/* Replication Ideas */}
        {replicationIdeas.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Replicate It — 3 New Ideas</h3>
            {replicationIdeas.map((idea, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <p className="text-sm flex-1">{idea}</p>
                <Button size="sm" variant="outline" onClick={() => navigate(`/create/video-machine?topic=${encodeURIComponent(idea)}`)}>
                  Build <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Underperformers */}
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><TrendingDown className="h-5 w-5 text-destructive" /> Dead Videos (&lt;50% Average)</h2>
          {underperformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No significant underperformers. Nice consistency!</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {underperformers.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-destructive/20 bg-card p-4 flex gap-3">
                  <img src={v.thumbnail} alt="" className="h-16 w-28 rounded-lg object-cover shrink-0" />
                  <div>
                    <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{formatCount(v.viewCount)} views</span>
                      <span className="text-xs font-bold text-destructive">▼ {v.pct}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Fail Pattern */}
        {failPattern && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
            <p className="text-xs font-semibold uppercase text-destructive mb-2">🚫 Never Again</p>
            <p className="text-sm leading-relaxed">{failPattern}</p>
          </motion.div>
        )}
      </div>
    </FeaturePage>
  );
}
