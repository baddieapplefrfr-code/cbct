import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface ConversionData {
  best_video: { title: string; thumbnail: string; conversion_rate: number; views: number; explanation: string };
  top_converters: { title: string; conversion_rate: number; views: number }[];
  worst_converters: { title: string; conversion_rate: number; views: number; reason: string }[];
  by_format: { format: string; avg_conversion: number }[];
  avg_conversion_rate: number;
  subscribe_trigger_timing: { minute: number; reason: string };
  cta_recommendation: string;
}

const scoreStyle = (s: number) => {
  if (s >= 3) return { color: "hsl(var(--success))" };
  if (s >= 1.5) return { color: "hsl(var(--warning))" };
  return { color: "hsl(var(--destructive))" };
};

export default function SubscriberConverter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<ConversionData | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 30);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);
      const result = await callAI(
        `Analyse which videos convert viewers into subscribers. Return JSON: {best_video: {title, thumbnail, conversion_rate (percentage), views, explanation}, top_converters: [{title, conversion_rate, views}] (3 items), worst_converters: [{title, conversion_rate, views, reason}] (3 items), by_format: [{format, avg_conversion}], avg_conversion_rate (number), subscribe_trigger_timing: {minute (number), reason}, cta_recommendation (string)}`,
        `${context}\n\nAnalyse subscriber conversion patterns across all videos.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <FeaturePage emoji="📈" title="Subscriber Converter" description="Which videos actually grow your channel?">
      <LoadingSteps steps={["Loading video data...", "Calculating conversion rates...", "Finding patterns..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="📈" title="Subscriber Converter" description="Views are vanity. Subscribers are reality. See which content converts watchers into fans.">
      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="t-label mb-3">BEST CONVERTING VIDEO</p>
            <p className="text-xl font-bold mb-2">{data.best_video.title}</p>
            <p className="animate-count" style={{ fontSize: 64, fontWeight: 800, ...scoreStyle(data.best_video.conversion_rate) }}>{data.best_video.conversion_rate}%</p>
            <p className="text-sm mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>conversion rate — {(data.best_video.conversion_rate / (data.avg_conversion_rate || 1)).toFixed(1)}x better than average</p>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{data.best_video.explanation}</p>
          </motion.div>

          {/* Layer 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Converters */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--success))" }}>🏆 TOP CONVERTERS</p>
              {data.top_converters?.map((v, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg" style={{ background: "hsl(var(--secondary) / 0.5)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{formatCount(v.views)} views</p>
                  </div>
                  <span className="text-lg font-bold ml-3" style={{ color: "hsl(var(--success))" }}>{v.conversion_rate}%</span>
                </div>
              ))}
            </motion.div>

            {/* Worst Converters */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--destructive))" }}>⚠️ VIEWS BUT NO SUBSCRIBERS</p>
              {data.worst_converters?.map((v, i) => (
                <div key={i} className="p-3 rounded-lg space-y-1" style={{ background: "hsl(var(--destructive) / 0.05)" }}>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium truncate flex-1">{v.title}</p>
                    <span className="text-sm font-bold ml-3" style={{ color: "hsl(var(--destructive))" }}>{v.conversion_rate}%</span>
                  </div>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{v.reason}</p>
                </div>
              ))}
            </motion.div>

            {/* By Format */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>📊 CONVERSION BY FORMAT</p>
              {data.by_format?.map((f, i) => {
                const max = Math.max(...data.by_format.map(x => x.avg_conversion), 1);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{f.format}</span>
                      <span className="font-bold" style={scoreStyle(f.avg_conversion)}>{f.avg_conversion}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(f.avg_conversion / max) * 100}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }} style={{ background: "hsl(var(--info))" }} />
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Subscribe Timing */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--primary))" }}>⏱ SUBSCRIBE TRIGGER TIMING</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Most subscribes happen around:</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: "hsl(var(--primary))" }}>{data.subscribe_trigger_timing.minute}:00</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{data.subscribe_trigger_timing.reason}</p>
            </motion.div>
          </div>

          {/* Action Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="p-8 rounded-xl text-center" style={{ background: "hsl(var(--primary) / 0.1)", border: "2px solid hsl(var(--primary) / 0.3)" }}>
            <p className="t-label mb-2" style={{ color: "hsl(var(--primary))" }}>🎯 CTA RECOMMENDATION</p>
            <p className="text-lg font-semibold">{data.cta_recommendation}</p>
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
