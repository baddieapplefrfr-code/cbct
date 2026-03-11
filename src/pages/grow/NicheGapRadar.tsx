import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import GameLoader from "@/components/GameLoader";
import ShareInsight from "@/components/ShareInsight";
import { useChannelData } from "@/hooks/useChannelData";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";
import { friendlyError } from "@/lib/errors";

const s = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export default function NicheGapRadar() {
  const { channel, videos, loading: dataLoading, channelContext } = useChannelData();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => { if (channel && videos.length > 0 && data.length === 0) analyse(); }, [channel, videos]);

  async function analyse() {
    setLoading(true); setProgress(0); setError("");
    try {
      setProgress(20);
      const res = await callAI(
        "You are a YouTube niche analyst. Identify 8 topics NOT covered by major channels in this niche with rising demand. Return JSON array: [{topic: string, score: number (1-100), why_uncovered: string, search_signal: string, how_to_own: string, suggested_title: string, days_left: number}]",
        channelContext
      );
      setProgress(80);
      setData(parseJsonFromAI(res) || []);
      setProgress(100);
    } catch (err) {
      setError(friendlyError(err));
    }
    setLoading(false);
  }

  if (dataLoading || loading) {
    return (
      <FeaturePage emoji="🔥" title="Niche Gap Radar" description="What nobody in your niche is covering right now">
        <GameLoader progress={progress} type="ai" message="Scanning niche opportunities..." />
      </FeaturePage>
    );
  }

  return (
    <FeaturePage emoji="🔥" title="Niche Gap Radar" description="What nobody in your niche is covering right now">
      {error && (
        <div className="cb-card cb-card-problem mb-6">
          <p className="text-sm text-foreground">{error}</p>
          <button onClick={analyse} className="text-xs text-primary mt-2 underline">Try Again</button>
        </div>
      )}
      {/* Layer 1 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <p className="data-number-xl" style={{ fontSize: "52px", fontWeight: 800, color: "hsl(var(--primary))" }}>{data.length}</p>
        <p className="text-lg text-muted-foreground">unclaimed topics in your niche</p>
      </motion.div>

      {/* Layer 2 */}
      <div className="grid sm:grid-cols-2 gap-3">
        {data.map((topic, i) => {
          const urgency = topic.days_left < 7 ? "destructive" : topic.days_left < 14 ? "warning" : "success";
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="cb-card space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{s(topic.topic)}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `hsl(var(--${urgency}) / 0.12)`, color: `hsl(var(--${urgency}))` }}>
                  {topic.days_left}d left
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                <div className="h-full rounded-full bg-primary bar-animate" style={{ width: `${topic.score}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{s(topic.why_uncovered)}</p>
              <p className="text-xs font-medium" style={{ color: "hsl(var(--info))" }}>Title: "{s(topic.suggested_title)}"</p>
            </motion.div>
          );
        })}
      </div>

      {data.length > 0 && <ShareInsight title="Niche Gap Radar" value={`${data.length} gaps`} subtitle={`Top: ${s(data[0]?.topic)} — ${data[0]?.score}/100`} />}
    </FeaturePage>
  );
}
