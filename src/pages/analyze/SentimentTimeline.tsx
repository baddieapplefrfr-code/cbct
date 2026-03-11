import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface SentimentData {
  positive_pct: number; neutral_pct: number; negative_pct: number;
  trend: string;
  emotion_breakdown: { emotion: string; percentage: number }[];
  reply_opportunities: { comment: string; author: string; reason: string }[];
  recurring_complaints: { issue: string; count: number; example: string }[];
  timeline_events: { day: number; event: string; sentiment_shift: string }[];
}

export default function SentimentTimeline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<SentimentData | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 10);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);
      const result = await callAI(
        `Analyse comment sentiment across recent videos. Return JSON: {positive_pct (number), neutral_pct (number), negative_pct (number), trend ("improving"|"declining"|"stable"), emotion_breakdown: [{emotion, percentage}] (5 emotions: Excited, Confused, Grateful, Critical, Curious), reply_opportunities: [{comment, author, reason}] (3-5 items), recurring_complaints: [{issue, count, example}] (3 items), timeline_events: [{day (1-30), event, sentiment_shift}]}`,
        `${context}\n\nAnalyse the overall sentiment patterns in comments.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const trendColor = (t: string) => {
    if (t === "improving") return "hsl(var(--success))";
    if (t === "declining") return "hsl(var(--destructive))";
    return "hsl(var(--muted-foreground))";
  };

  const emotionColor = (e: string) => {
    const map: Record<string, string> = { Excited: "--success", Confused: "--warning", Grateful: "--info", Critical: "--destructive", Curious: "--color-opportunity" };
    return `hsl(var(${map[e] || "--muted-foreground"}))`;
  };

  if (loading) return (
    <FeaturePage emoji="💬" title="Sentiment Timeline" description="How your audience feels over time">
      <LoadingSteps steps={["Loading comments...", "Analysing sentiment...", "Building timeline..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="💬" title="Sentiment Timeline" description="Comment sentiment across your recent videos, mapped by emotion.">
      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="flex justify-center gap-8">
              {[{ label: "Positive", val: data.positive_pct, color: "--success" }, { label: "Neutral", val: data.neutral_pct, color: "--muted-foreground" }, { label: "Negative", val: data.negative_pct, color: "--destructive" }].map(s => (
                <div key={s.label} className="text-center">
                  <p className="animate-count" style={{ fontSize: 48, fontWeight: 800, color: `hsl(var(${s.color}))` }}>{s.val}%</p>
                  <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold" style={{ color: trendColor(data.trend) }}>
              Sentiment {data.trend} {data.trend === "improving" ? "↑" : data.trend === "declining" ? "↓" : "→"}
            </p>
          </motion.div>

          {/* Layer 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Emotion Breakdown */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--color-opportunity))" }}>😄 EMOTION BREAKDOWN</p>
              {data.emotion_breakdown?.map((e, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{e.emotion}</span>
                    <span className="font-bold" style={{ color: emotionColor(e.emotion) }}>{e.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${e.percentage}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }} style={{ background: emotionColor(e.emotion) }} />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Reply Opportunities */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>💬 REPLY OPPORTUNITIES</p>
              {data.reply_opportunities?.map((r, i) => (
                <div key={i} className="p-3 rounded-lg space-y-1" style={{ background: "hsl(var(--secondary) / 0.5)", borderLeft: "3px solid hsl(var(--info))" }}>
                  <p className="text-sm italic">"{r.comment}"</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>— {r.author}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}>{r.reason}</span>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Recurring Complaints */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="cb-card space-y-4 md:col-span-2">
              <p className="t-label" style={{ color: "hsl(var(--destructive))" }}>🔁 RECURRING COMPLAINTS</p>
              <div className="grid md:grid-cols-3 gap-4">
                {data.recurring_complaints?.map((c, i) => (
                  <div key={i} className="p-4 rounded-lg" style={{ background: "hsl(var(--destructive) / 0.05)", borderLeft: "3px solid hsl(var(--destructive))" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold" style={{ color: "hsl(var(--destructive))" }}>{c.count}</span>
                      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>mentions</span>
                    </div>
                    <p className="text-sm font-medium mb-1">{c.issue}</p>
                    <p className="text-xs italic" style={{ color: "hsl(var(--muted-foreground))" }}>"{c.example}"</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
