import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import CopyButton from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface BurnoutData {
  battery_level: number;
  verdict: string;
  current_streak: number;
  best_streak: number;
  avg_run_weeks: number;
  total_starts_stops: number;
  burnout_risk: "Low" | "Medium" | "High" | "Critical";
  buffer_advice: string;
  easy_content: { title: string; format: string; time_estimate: string }[];
  recovery_schedule: string[];
}

export default function BurnoutPredictor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<BurnoutData | null>(null);

  useEffect(() => {
    if (!isChannelConnected()) { navigate("/", { replace: true }); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoadStep(0);
      const ch = await getMyChannel();
      const vids = await getRecentVideos(ch.id, 50);
      setLoadStep(1);
      const context = getChannelContext(ch, vids);
      setLoadStep(2);
      const result = await callAI(
        `Analyse posting patterns to predict burnout. Return JSON: {battery_level (0-100), verdict (one sentence like "Your battery is at 65% — you typically burn out after week 7. You're in week 5."), current_streak (weeks of consistent posting), best_streak (weeks), avg_run_weeks (average streak before stopping), total_starts_stops (number of times started/stopped), burnout_risk ("Low"|"Medium"|"High"|"Critical"), buffer_advice (string about filming extra videos), easy_content: [{title, format, time_estimate}] (3 quick video ideas under 2 hours), recovery_schedule: [string] (4 items for a light 2-week schedule)}`,
        `${context}\n\nAnalyse upload consistency and burnout patterns.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const batteryColor = (l: number) => {
    if (l >= 70) return "hsl(var(--success))";
    if (l >= 40) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const riskColor = (r: string) => {
    const map: Record<string, string> = { Low: "--success", Medium: "--warning", High: "--color-warning", Critical: "--destructive" };
    return `hsl(var(${map[r] || "--muted-foreground"}))`;
  };

  if (loading) return (
    <FeaturePage emoji="🔋" title="Content Battery" description="Predicting your energy levels...">
      <LoadingSteps steps={["Loading posting history...", "Analysing consistency patterns...", "Predicting burnout risk..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="🔋" title="Your Content Energy" description="We track your posting patterns to predict burnout before it hits.">
      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 — Battery Visual */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
            <div className="relative w-32 h-56 rounded-2xl overflow-hidden" style={{ border: "4px solid hsl(var(--border))" }}>
              {/* Battery cap */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 rounded-t-lg" style={{ background: "hsl(var(--border))" }} />
              {/* Fill */}
              <motion.div className="absolute bottom-0 left-0 right-0 rounded-b-xl" initial={{ height: 0 }} animate={{ height: `${data.battery_level}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }} style={{ background: batteryColor(data.battery_level) }} />
              {/* Percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ fontSize: 36, fontWeight: 800, color: data.battery_level > 50 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}>{data.battery_level}%</span>
              </div>
            </div>
            <p className="text-lg mt-6 text-center max-w-md" style={{ color: "hsl(var(--muted-foreground))" }}>{data.verdict}</p>
          </motion.div>

          {/* Layer 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Streak Analysis */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>📊 STREAK ANALYSIS</p>
              <div className="flex gap-6">
                <div className="text-center">
                  <p style={{ fontSize: 36, fontWeight: 800, color: "hsl(var(--primary))" }}>{data.current_streak}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Current weeks</p>
                </div>
                <div className="text-center">
                  <p style={{ fontSize: 36, fontWeight: 800, color: "hsl(var(--success))" }}>{data.best_streak}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Personal best</p>
                </div>
              </div>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Started and stopped {data.total_starts_stops} times. Average run: {data.avg_run_weeks} weeks.</p>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${riskColor(data.burnout_risk)}20`, color: riskColor(data.burnout_risk) }}>
                {data.burnout_risk} Burnout Risk
              </span>
            </motion.div>

            {/* Buffer Builder */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--success))" }}>🛡 BUFFER BUILDER</p>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{data.buffer_advice}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/create/video-machine")}>Build Buffer Video →</Button>
            </motion.div>

            {/* Easy Content */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--warning))" }}>⚡ EASY CONTENT BANK</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Quick ideas for when battery is low</p>
              {data.easy_content?.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsl(var(--secondary) / 0.5)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}>{c.format}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>{c.time_estimate}</span>
                    </div>
                  </div>
                  <CopyButton text={c.title} />
                </div>
              ))}
            </motion.div>

            {/* Recovery Schedule */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--color-opportunity))" }}>🌱 RECOVERY SCHEDULE</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Light 2-week plan to stay consistent</p>
              {data.recovery_schedule?.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "hsl(var(--color-opportunity) / 0.15)", color: "hsl(var(--color-opportunity))" }}>{i + 1}</span>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
