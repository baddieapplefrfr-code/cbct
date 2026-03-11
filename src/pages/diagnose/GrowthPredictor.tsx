import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FeaturePage from "@/components/FeaturePage";
import LoadingSteps from "@/components/LoadingSteps";
import { useNavigate } from "react-router-dom";
import { isChannelConnected } from "@/lib/youtube-api";
import { getMyChannel, getRecentVideos, getChannelContext, formatCount } from "@/lib/youtube-api";
import { callAI, parseJsonFromAI } from "@/lib/ai-service";

interface GrowthData {
  days_to_100k: number;
  projected_date: string;
  current_subs: number;
  monthly_growth_rate: number;
  scenarios: { name: string; emoji: string; days: number; description: string }[];
  monetisation: { subs_progress: number; subs_needed: number; watch_hours_progress: number; watch_hours_needed: number; days_to_monetisation: number };
  milestones: { target: number; days_away: number; reached: boolean }[];
  one_thing: string;
}

export default function GrowthPredictor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [data, setData] = useState<GrowthData | null>(null);

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
        `Predict channel growth trajectory. Return JSON: {days_to_100k (number), projected_date (string like "April 2028"), current_subs (number), monthly_growth_rate (percentage), scenarios: [{name, emoji (single emoji), days (to 100k), description}] (3 scenarios: current pace, double posting, one viral video), monetisation: {subs_progress (current), subs_needed (1000), watch_hours_progress (current estimate), watch_hours_needed (4000), days_to_monetisation}, milestones: [{target (1000/5000/10000/25000/50000/100000), days_away, reached (boolean)}], one_thing (single most impactful action to accelerate growth)}`,
        `${context}\n\nProject growth trajectory based on current data.`
      );
      const parsed = parseJsonFromAI(result);
      if (parsed) setData(parsed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <FeaturePage emoji="🔮" title="Growth Predictor" description="Where is your channel headed?">
      <LoadingSteps steps={["Loading growth data...", "Modelling trajectory...", "Predicting milestones..."]} currentStep={loadStep} />
    </FeaturePage>
  );

  return (
    <FeaturePage emoji="🔮" title="Your Channel's Future" description="Based on real growth data — where you're headed and how to get there faster.">
      {data && (
        <div className="space-y-12 max-w-[920px] mx-auto">
          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="t-label mb-3">DAYS UNTIL 100K</p>
            <p className="animate-count" style={{ fontSize: 64, fontWeight: 800, color: "hsl(var(--primary))" }}>{data.days_to_100k}</p>
            <p className="text-lg mt-3" style={{ color: "hsl(var(--muted-foreground))" }}>At current pace: 100K by <strong>{data.projected_date}</strong></p>
            <div className="mt-6 max-w-md mx-auto">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min((data.current_subs / 100000) * 100, 100)}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }} style={{ background: "hsl(var(--primary))" }} />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                <span>{formatCount(data.current_subs)}</span>
                <span>100K</span>
              </div>
            </div>
          </motion.div>

          {/* Layer 2 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Scenarios */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="cb-card space-y-4 md:col-span-2">
              <p className="t-label" style={{ color: "hsl(var(--info))" }}>🏁 SCENARIO PLANNER</p>
              <div className="grid md:grid-cols-3 gap-4">
                {data.scenarios?.map((s, i) => {
                  const colors = ["--muted-foreground", "--info", "--success"];
                  return (
                    <div key={i} className="p-4 rounded-xl text-center" style={{ background: `hsl(var(${colors[i]}) / 0.06)`, border: `1px solid hsl(var(${colors[i]}) / 0.2)` }}>
                      <p className="text-2xl mb-2">{s.emoji}</p>
                      <p className="text-sm font-semibold mb-1">{s.name}</p>
                      <p style={{ fontSize: 36, fontWeight: 800, color: `hsl(var(${colors[i]}))` }}>{s.days}d</p>
                      <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>{s.description}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Monetisation */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--success))" }}>💰 MONETISATION COUNTDOWN</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Subscribers</span><span className="font-bold">{formatCount(data.monetisation.subs_progress)} / {formatCount(data.monetisation.subs_needed)}</span></div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min((data.monetisation.subs_progress / data.monetisation.subs_needed) * 100, 100)}%` }}
                      transition={{ duration: 0.7 }} style={{ background: "hsl(var(--success))" }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Watch Hours</span><span className="font-bold">{formatCount(data.monetisation.watch_hours_progress)} / {formatCount(data.monetisation.watch_hours_needed)}</span></div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min((data.monetisation.watch_hours_progress / data.monetisation.watch_hours_needed) * 100, 100)}%` }}
                      transition={{ duration: 0.7, delay: 0.1 }} style={{ background: "hsl(var(--success))" }} />
                  </div>
                </div>
              </div>
              {data.monetisation.days_to_monetisation > 0 && (
                <p className="text-sm text-center font-medium" style={{ color: "hsl(var(--success))" }}>{data.monetisation.days_to_monetisation} days to monetisation</p>
              )}
            </motion.div>

            {/* Milestones */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="cb-card space-y-4">
              <p className="t-label" style={{ color: "hsl(var(--primary))" }}>🏅 MILESTONE MAP</p>
              <div className="space-y-2">
                {data.milestones?.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: m.reached ? "hsl(var(--success) / 0.08)" : i === data.milestones.findIndex(x => !x.reached) ? "hsl(var(--primary) / 0.08)" : "transparent" }}>
                    <span className={`w-3 h-3 rounded-full shrink-0 ${m.reached ? "" : ""}`} style={{ background: m.reached ? "hsl(var(--success))" : i === data.milestones.findIndex(x => !x.reached) ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                    <span className="text-sm flex-1" style={{ color: m.reached ? "hsl(var(--success))" : "hsl(var(--foreground))" }}>{formatCount(m.target)}</span>
                    {m.reached ? (
                      <span className="text-xs font-bold" style={{ color: "hsl(var(--success))" }}>✓</span>
                    ) : (
                      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{m.days_away}d away</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Action Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="p-8 rounded-xl text-center" style={{ background: "hsl(var(--primary) / 0.1)", border: "2px solid hsl(var(--primary) / 0.3)" }}>
            <p className="t-label mb-2" style={{ color: "hsl(var(--primary))" }}>🎯 FASTEST WAY TO ACCELERATE</p>
            <p className="text-lg font-semibold">{data.one_thing}</p>
          </motion.div>
        </div>
      )}
    </FeaturePage>
  );
}
