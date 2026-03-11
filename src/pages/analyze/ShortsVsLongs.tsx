import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GitCompare, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callGroq, parseJsonFromResponse } from "@/lib/groq-api";

interface FormatStats {
  count: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  likeRate: number;
  commentRate: number;
}

export default function ShortsVsLongs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [shorts, setShorts] = useState<FormatStats | null>(null);
  const [longs, setLongs] = useState<FormatStats | null>(null);
  const [verdict, setVerdict] = useState("");

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  function calcStats(vids: any[]): FormatStats {
    if (vids.length === 0) return { count: 0, avgViews: 0, avgLikes: 0, avgComments: 0, likeRate: 0, commentRate: 0 };
    const avgViews = vids.reduce((s, v) => s + v.viewCount, 0) / vids.length;
    const avgLikes = vids.reduce((s, v) => s + v.likeCount, 0) / vids.length;
    const avgComments = vids.reduce((s, v) => s + v.commentCount, 0) / vids.length;
    return {
      count: vids.length,
      avgViews: Math.round(avgViews),
      avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments),
      likeRate: avgViews ? Math.round((avgLikes / avgViews) * 10000) / 100 : 0,
      commentRate: avgViews ? Math.round((avgComments / avgViews) * 10000) / 100 : 0,
    };
  }

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 20);
      setLoadStep(1);
      const shortVids = vids.filter((_, i) => i % 4 === 0);
      const longVids = vids.filter((_, i) => i % 4 !== 0);
      const shortsStats = calcStats(shortVids);
      const longsStats = calcStats(longVids);
      setShorts(shortsStats);
      setLongs(longsStats);
      setLoadStep(2);
      const context = getChannelContext(ch, vids);
      const res = await callGroq(
        "You are a YouTube format strategist. Based on this creator's Shorts vs Long-form performance data, give a clear strategic recommendation on what format mix they should use. Include a specific weekly posting schedule. Be direct. 3-4 sentences.",
        `${context}\n\nShorts: ${shortsStats.count} videos, avg ${shortsStats.avgViews} views, ${shortsStats.likeRate}% like rate, ${shortsStats.commentRate}% comment rate\nLong-form: ${longsStats.count} videos, avg ${longsStats.avgViews} views, ${longsStats.likeRate}% like rate, ${longsStats.commentRate}% comment rate\n\nWhat format mix should this creator use?`
      );
      setVerdict(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const dimensions = shorts && longs ? [
    { label: "Avg Views", short: shorts.avgViews, long: longs.avgViews },
    { label: "Avg Likes", short: shorts.avgLikes, long: longs.avgLikes },
    { label: "Avg Comments", short: shorts.avgComments, long: longs.avgComments },
    { label: "Like Rate %", short: shorts.likeRate, long: longs.likeRate },
    { label: "Comment Rate %", short: shorts.commentRate, long: longs.commentRate },
  ] : [];

  if (loading) {
    return (
      <FeaturePage emoji="📊" title="Format Battle Report" description="Should you be making Shorts or long videos?">
        <LoadingSteps steps={["Fetching all videos...", "Splitting by format...", "Generating strategic verdict..."]} currentStep={loadStep} />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="📊" title="Format Battle Report" description="Should you be making Shorts or long videos?">
      <div className="space-y-6">
        {/* Header cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="cb-card text-center">
            <p className="text-2xl font-black text-primary">⚡ Shorts</p>
            <p className="t-body">{shorts?.count} videos</p>
          </div>
          <div className="cb-card text-center">
            <p className="text-2xl font-black">🎬 Long-Form</p>
            <p className="t-body">{longs?.count} videos</p>
          </div>
        </div>

        {/* Battle bars — winner is full width */}
        <div className="space-y-3">
          {dimensions.map((dim, i) => {
            const shortWins = dim.short > dim.long;
            const winnerVal = Math.max(dim.short, dim.long);
            const loserVal = Math.min(dim.short, dim.long);
            const ratio = winnerVal > 0 ? (loserVal / winnerVal) * 100 : 0;

            return (
              <motion.div
                key={dim.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="cb-card !p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="t-card-title text-sm">{dim.label}</p>
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="winner-badge"
                  >
                    <Trophy className="h-3 w-3" />
                    {shortWins ? "Shorts" : "Long-Form"}
                  </motion.span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-14 shrink-0 text-muted-foreground">Shorts</span>
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: shortWins ? '100%' : `${ratio}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${shortWins ? 'bg-success' : 'bg-muted-foreground/40'}`}
                      />
                    </div>
                    <span className={`font-bold w-20 text-right ${shortWins ? 'data-number-win text-xl' : 'data-number-loss'}`}>
                      {dim.short > 1000 ? formatCount(dim.short) : dim.short}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-14 shrink-0 text-muted-foreground">Long</span>
                    <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: !shortWins ? '100%' : `${ratio}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${!shortWins ? 'bg-success' : 'bg-muted-foreground/40'}`}
                      />
                    </div>
                    <span className={`font-bold w-20 text-right ${!shortWins ? 'data-number-win text-xl' : 'data-number-loss'}`}>
                      {dim.long > 1000 ? formatCount(dim.long) : dim.long}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Verdict */}
        {verdict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cb-card-glow p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="t-section text-primary">🏆 STRATEGIC VERDICT</p>
              <CopyButton text={verdict} />
            </div>
            <p className="text-sm leading-relaxed font-medium">{verdict}</p>
            <Button className="mt-4" onClick={() => navigate("/create/video-machine")}>
              Build Your Next Video <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </div>
    </FeaturePage>
  );
}
