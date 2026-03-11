import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface ViralMoment {
  video_title: string; timestamp: string; quote: string;
  why_viral: string; short_title: string; short_hook: string; viral_potential: number;
}
interface ViralData { total_moments: number; moments: ViralMoment[]; summary: string }

export default function ViralMoments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<ViralData | null>(null);

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
        `Scan videos for viral-worthy moments that could blow up as Shorts or clips. Return JSON: {total_moments (number), moments: [{video_title, timestamp, quote (the exact quotable text), why_viral, short_title, short_hook, viral_potential (1-100)}] (top 5 ranked by viral_potential), summary (one sentence about untapped potential)}`,
        `${context}\n\nIdentify hidden viral moments in existing content.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const potentialColor = (p: number) => {
    if (p >= 80) return "hsl(var(--success))";
    if (p >= 50) return "hsl(var(--warning))";
    return "hsl(var(--muted-foreground))";
  };

  if (loading) return (
    <FeaturePage emoji="⚡" title="Viral Moments" description="Scanning for hidden gold...">
      <LoadingSteps steps={["Scanning video content...", "Detecting viral patterns...", "Ranking moments..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="⚡" title="Your Hidden Gold" description="Existing videos scanned for moments that could blow up as Shorts or clips.">
      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="t-label mb-3">VIRAL MOMENTS FOUND</p>
            <p className="animate-count" style={{ fontSize: 64, fontWeight: 800, color: "hsl(var(--primary))" }}>{data.total_moments}</p>
            <p className="text-lg mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>{data.summary}</p>
          </motion.div>

          {/* Layer 2 — Moment Cards */}
          <div className="space-y-4">
            {data.moments?.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="cb-card space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>{m.video_title}</span>
                      <span className="text-xs font-mono" style={{ color: "hsl(var(--warning))" }}>{m.timestamp}</span>
                    </div>
                    <p className="text-lg italic font-medium leading-snug">"{m.quote}"</p>
                    <p className="text-sm mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>{m.why_viral}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Viral Score</p>
                    <p style={{ fontSize: 36, fontWeight: 800, color: potentialColor(m.viral_potential) }}>{m.viral_potential}</p>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${m.viral_potential}%` }}
                    transition={{ duration: 0.7, delay: i * 0.1 }} style={{ background: potentialColor(m.viral_potential) }} />
                </div>
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Suggested Short title:</p>
                    <p className="text-sm font-semibold">{m.short_title}</p>
                  </div>
                  <CopyButton text={`${m.short_title}\n\nHook: ${m.short_hook}`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
